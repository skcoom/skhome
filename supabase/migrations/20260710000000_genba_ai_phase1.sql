-- SKコーム現場管理AI フェーズ1: 既存スキーマは変更・削除せず、列とテーブルを追加する。

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS genba_page_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS last_line_activity_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_genba_page_token
  ON public.projects(genba_page_token);

ALTER TABLE public.project_media
  ADD COLUMN IF NOT EXISTS line_message_id TEXT,
  ADD COLUMN IF NOT EXISTS r2_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_media_line_message_id
  ON public.project_media(line_message_id)
  WHERE line_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.site_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  alias TEXT NOT NULL CHECK (length(btrim(alias)) > 0),
  source TEXT NOT NULL CHECK (length(btrim(source)) > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(site_id, alias)
);

CREATE TABLE IF NOT EXISTS public.bot_templates (
  template_id TEXT PRIMARY KEY CHECK (template_id ~ '^T-0[1-7]$'),
  body TEXT NOT NULL CHECK (length(body) > 0),
  variables TEXT[] NOT NULL DEFAULT '{}',
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT bot_templates_approval_pair CHECK (
    (approved_at IS NULL AND approved_by IS NULL)
    OR (approved_at IS NOT NULL AND approved_by IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.line_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id TEXT NOT NULL UNIQUE,
  webhook_event_id TEXT,
  event_type TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('user', 'group', 'room')),
  source_id TEXT NOT NULL,
  sender_id TEXT,
  sender_name TEXT,
  raw_payload JSONB NOT NULL,
  text_content TEXT,
  r2_key TEXT,
  content_type TEXT,
  burst_id TEXT,
  site_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  action TEXT CHECK (action IN ('assign', 'ask', 'ask_similar', 'create', 'ignore')),
  phase TEXT CHECK (phase IN ('before', 'during', 'after', 'unknown')),
  confidence NUMERIC(4,3) CHECK (confidence BETWEEN 0 AND 1),
  candidates JSONB NOT NULL DEFAULT '[]'::JSONB,
  new_site_name TEXT,
  state TEXT NOT NULL DEFAULT 'received' CHECK (
    state IN ('received', 'archived', 'processing', 'resolving', 'awaiting_confirmation', 'recorded', 'ignored', 'failed')
  ),
  error TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  reply_sent_at TIMESTAMP WITH TIME ZONE,
  correction_open_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.correction_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_event_id UUID REFERENCES public.line_events(id) ON DELETE SET NULL,
  original_site_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  observed_alias TEXT,
  normalized_alias TEXT,
  log_type TEXT NOT NULL CHECK (log_type IN ('correction', 'normalization_hit')),
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_aliases_alias ON public.site_aliases(alias);
CREATE INDEX IF NOT EXISTS idx_line_events_sender_received ON public.line_events(sender_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_events_source_received ON public.line_events(source_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_events_burst ON public.line_events(burst_id);
CREATE INDEX IF NOT EXISTS idx_line_events_state ON public.line_events(state);
CREATE INDEX IF NOT EXISTS idx_correction_logs_created ON public.correction_logs(created_at DESC);

ALTER TABLE public.site_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.correction_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.register_line_events_batch(p_events JSONB)
RETURNS SETOF public.line_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  inserted_message_ids TEXT[] := ARRAY[]::TEXT[];
  inserted_message_id TEXT;
BEGIN
  IF jsonb_typeof(p_events) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'p_events must be a JSON array';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_events)
  LOOP
    inserted_message_id := NULL;
    INSERT INTO public.line_events (
      message_id, webhook_event_id, event_type, source_type, source_id,
      sender_id, sender_name, raw_payload, text_content, r2_key,
      content_type, burst_id, state, received_at
    ) VALUES (
      item->>'message_id', NULLIF(item->>'webhook_event_id', ''), item->>'event_type',
      item->>'source_type', item->>'source_id', NULLIF(item->>'sender_id', ''),
      NULLIF(item->>'sender_name', ''), item->'raw_payload', NULLIF(item->>'text_content', ''),
      NULLIF(item->>'r2_key', ''), NULLIF(item->>'content_type', ''), NULLIF(item->>'burst_id', ''),
      item->>'state', (item->>'received_at')::TIMESTAMP WITH TIME ZONE
    )
    ON CONFLICT (message_id) DO NOTHING
    RETURNING message_id INTO inserted_message_id;

    IF inserted_message_id IS NOT NULL THEN
      inserted_message_ids := array_append(inserted_message_ids, inserted_message_id);
    END IF;
  END LOOP;

  RETURN QUERY
  UPDATE public.line_events AS le
  SET state = 'processing', processing_started_at = NOW()
  WHERE le.message_id IN (
      SELECT value->>'message_id' FROM jsonb_array_elements(p_events)
    )
    AND le.event_type = 'message:text'
    AND le.state = 'received'
  RETURNING le.*;

  RETURN QUERY
  SELECT le.*
  FROM public.line_events AS le
  WHERE le.message_id = ANY(inserted_message_ids)
    AND le.event_type = 'message:image';
END;
$$;

REVOKE ALL ON FUNCTION public.register_line_events_batch(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_line_events_batch(JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.record_line_burst(
  p_burst_id TEXT,
  p_site_id UUID,
  p_action TEXT,
  p_phase TEXT,
  p_confidence NUMERIC,
  p_new_site_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_site_id UUID := p_site_id;
BEGIN
  IF p_action NOT IN ('assign', 'create') THEN
    RAISE EXCEPTION 'invalid record action';
  END IF;
  IF p_phase NOT IN ('before', 'during', 'after', 'unknown') THEN
    RAISE EXCEPTION 'invalid media phase';
  END IF;

  IF p_action = 'create' THEN
    IF p_new_site_name IS NULL OR length(btrim(p_new_site_name)) < 2 THEN
      RAISE EXCEPTION 'new site name is required';
    END IF;
    INSERT INTO public.projects (name, status, is_public)
    VALUES (btrim(p_new_site_name), 'in_progress', FALSE)
    RETURNING id INTO resolved_site_id;
  ELSIF resolved_site_id IS NULL THEN
    RAISE EXCEPTION 'site id is required for assign';
  END IF;

  INSERT INTO public.project_media (
    project_id, type, phase, file_url, r2_key, line_message_id, is_featured
  )
  SELECT
    resolved_site_id,
    'image',
    CASE WHEN p_phase = 'unknown' THEN 'during' ELSE p_phase END,
    'r2://' || le.r2_key,
    le.r2_key,
    le.message_id,
    FALSE
  FROM public.line_events AS le
  WHERE le.burst_id = p_burst_id
    AND le.r2_key IS NOT NULL
  ON CONFLICT (line_message_id) WHERE line_message_id IS NOT NULL
  DO UPDATE SET
    project_id = EXCLUDED.project_id,
    phase = EXCLUDED.phase,
    file_url = EXCLUDED.file_url,
    r2_key = EXCLUDED.r2_key;

  UPDATE public.line_events
  SET site_id = resolved_site_id,
      action = p_action,
      phase = p_phase,
      confidence = p_confidence,
      new_site_name = CASE WHEN p_action = 'create' THEN p_new_site_name ELSE NULL END,
      state = 'recorded',
      error = NULL,
      processed_at = NOW(),
      processing_started_at = NULL
  WHERE burst_id = p_burst_id;

  UPDATE public.projects
  SET last_line_activity_at = COALESCE(
    (SELECT MAX(received_at) FROM public.line_events WHERE burst_id = p_burst_id),
    NOW()
  )
  WHERE id = resolved_site_id;

  RETURN resolved_site_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_line_burst(TEXT, UUID, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_line_burst(TEXT, UUID, TEXT, TEXT, NUMERIC, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.record_line_text(
  p_event_id UUID,
  p_site_id UUID,
  p_action TEXT,
  p_phase TEXT,
  p_confidence NUMERIC,
  p_new_site_name TEXT,
  p_description TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_site_id UUID := p_site_id;
  event_received_at TIMESTAMP WITH TIME ZONE;
BEGIN
  IF p_action NOT IN ('assign', 'create') THEN
    RAISE EXCEPTION 'invalid text record action';
  END IF;
  IF p_phase NOT IN ('before', 'during', 'after', 'unknown') THEN
    RAISE EXCEPTION 'invalid text phase';
  END IF;
  IF p_description IS NULL OR length(btrim(p_description)) = 0 THEN
    RAISE EXCEPTION 'text description is required';
  END IF;

  SELECT received_at INTO event_received_at
  FROM public.line_events
  WHERE id = p_event_id AND event_type = 'message:text'
  FOR UPDATE;
  IF event_received_at IS NULL THEN
    RAISE EXCEPTION 'text line event was not found';
  END IF;

  IF p_action = 'create' THEN
    IF p_new_site_name IS NULL OR length(btrim(p_new_site_name)) < 2 THEN
      RAISE EXCEPTION 'new site name is required';
    END IF;
    INSERT INTO public.projects (name, status, is_public)
    VALUES (btrim(p_new_site_name), 'in_progress', FALSE)
    RETURNING id INTO resolved_site_id;
  ELSIF resolved_site_id IS NULL THEN
    RAISE EXCEPTION 'site id is required for assign';
  END IF;

  INSERT INTO public.project_progress (project_id, date, description)
  VALUES (
    resolved_site_id,
    (event_received_at AT TIME ZONE 'Asia/Tokyo')::DATE,
    p_description
  );

  UPDATE public.line_events
  SET site_id = resolved_site_id,
      action = p_action,
      phase = p_phase,
      confidence = p_confidence,
      new_site_name = CASE WHEN p_action = 'create' THEN p_new_site_name ELSE NULL END,
      state = 'recorded',
      error = NULL,
      processed_at = NOW(),
      processing_started_at = NULL
  WHERE id = p_event_id;

  UPDATE public.projects
  SET last_line_activity_at = event_received_at
  WHERE id = resolved_site_id;

  RETURN resolved_site_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_line_text(UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_line_text(UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_line_burst(p_burst_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.line_events
    WHERE burst_id = p_burst_id
      AND state IN ('processing', 'awaiting_confirmation', 'recorded', 'ignored', 'failed')
  ) THEN
    RETURN FALSE;
  END IF;

  UPDATE public.line_events
  SET state = 'processing', processing_started_at = NOW()
  WHERE burst_id = p_burst_id AND state = 'archived';

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_line_burst(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_line_burst(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_recoverable_line_burst(
  p_archive_cutoff TIMESTAMP WITH TIME ZONE,
  p_processing_cutoff TIMESTAMP WITH TIME ZONE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate_burst_id TEXT;
BEGIN
  SELECT burst_id INTO candidate_burst_id
  FROM public.line_events
  WHERE burst_id IS NOT NULL
    AND (
      (state = 'archived' AND received_at < p_archive_cutoff)
      OR (
        state = 'processing'
        AND COALESCE(processing_started_at, received_at) < p_processing_cutoff
      )
    )
  ORDER BY received_at ASC
  LIMIT 1;

  IF candidate_burst_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT pg_try_advisory_xact_lock(hashtextextended(candidate_burst_id, 0)) THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.line_events
    WHERE burst_id = candidate_burst_id
      AND (
        (state = 'archived' AND received_at < p_archive_cutoff)
        OR (
          state = 'processing'
          AND COALESCE(processing_started_at, received_at) < p_processing_cutoff
        )
      )
  ) THEN
    RETURN NULL;
  END IF;

  UPDATE public.line_events
  SET state = 'processing', processing_started_at = NOW()
  WHERE burst_id = candidate_burst_id
    AND (
      state = 'archived'
      OR (
        state = 'processing'
        AND COALESCE(processing_started_at, received_at) < p_processing_cutoff
      )
    );

  RETURN candidate_burst_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_recoverable_line_burst(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_recoverable_line_burst(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_recoverable_line_text(
  p_received_cutoff TIMESTAMP WITH TIME ZONE,
  p_processing_cutoff TIMESTAMP WITH TIME ZONE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_id UUID;
BEGIN
  UPDATE public.line_events AS le
  SET state = 'processing', processing_started_at = NOW()
  WHERE le.id = (
    SELECT candidate.id
    FROM public.line_events AS candidate
    WHERE candidate.event_type = 'message:text'
      AND (
        (candidate.state = 'received' AND candidate.received_at < p_received_cutoff)
        OR (
          candidate.state = 'processing'
          AND COALESCE(candidate.processing_started_at, candidate.received_at) < p_processing_cutoff
        )
      )
    ORDER BY candidate.received_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING le.id INTO claimed_id;

  RETURN claimed_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_recoverable_line_text(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_recoverable_line_text(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO service_role;

CREATE OR REPLACE FUNCTION public.get_latest_line_attempts(p_limit INTEGER DEFAULT 20)
RETURNS SETOF public.line_events
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT attempts.*
  FROM (
    SELECT DISTINCT ON (COALESCE(le.burst_id, le.message_id)) le.*
    FROM public.line_events AS le
    WHERE le.processed_at IS NOT NULL
    ORDER BY COALESCE(le.burst_id, le.message_id), le.processed_at DESC
  ) AS attempts
  ORDER BY attempts.processed_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

REVOKE ALL ON FUNCTION public.get_latest_line_attempts(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_latest_line_attempts(INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.get_terminal_line_failure()
RETURNS SETOF public.line_events
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT le.*
  FROM public.line_events AS le
  WHERE (
    le.state = 'failed'
    AND le.error LIKE 'Confirmation delivery unavailable:%'
  ) OR le.error = 'daily_reply_limit_alerted'
  ORDER BY le.processed_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_terminal_line_failure() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_terminal_line_failure() TO service_role;

CREATE OR REPLACE FUNCTION public.find_unambiguous_pending_burst(
  p_source_id TEXT,
  p_since TIMESTAMP WITH TIME ZONE,
  p_until TIMESTAMP WITH TIME ZONE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_count INTEGER;
  pending_burst_id TEXT;
BEGIN
  SELECT COUNT(DISTINCT burst_id), MIN(burst_id)
  INTO pending_count, pending_burst_id
  FROM public.line_events
  WHERE source_id = p_source_id
    AND state = 'awaiting_confirmation'
    AND received_at >= p_since
    AND received_at <= p_until;

  RETURN CASE WHEN pending_count = 1 THEN pending_burst_id ELSE NULL END;
END;
$$;

REVOKE ALL ON FUNCTION public.find_unambiguous_pending_burst(TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_unambiguous_pending_burst(TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_line_burst_correction(
  p_answer_event_id UUID,
  p_burst_id TEXT,
  p_expected_state TEXT,
  p_site_id UUID,
  p_new_site_name TEXT,
  p_observed_alias TEXT,
  p_original_site_id UUID,
  p_learn_alias BOOLEAN,
  p_details JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_site_id UUID := p_site_id;
BEGIN
  IF p_expected_state = 'awaiting_confirmation' THEN
    UPDATE public.line_events
    SET state = 'resolving'
    WHERE burst_id = p_burst_id
      AND state = 'awaiting_confirmation'
      AND source_id = (
        SELECT source_id FROM public.line_events WHERE id = p_answer_event_id
      );
  ELSIF p_expected_state = 'recorded' THEN
    UPDATE public.line_events
    SET state = 'resolving'
    WHERE burst_id = p_burst_id
      AND state = 'recorded'
      AND correction_open_until >= NOW()
      AND source_id = (
        SELECT source_id FROM public.line_events WHERE id = p_answer_event_id
      );
  ELSE
    RAISE EXCEPTION 'invalid correction state';
  END IF;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF resolved_site_id IS NULL THEN
    IF p_new_site_name IS NULL OR length(btrim(p_new_site_name)) < 2 THEN
      RAISE EXCEPTION 'new site name is required';
    END IF;
    INSERT INTO public.projects (name, status, is_public)
    VALUES (btrim(p_new_site_name), 'in_progress', FALSE)
    RETURNING id INTO resolved_site_id;
  END IF;

  INSERT INTO public.project_media (
    project_id, type, phase, file_url, r2_key, line_message_id, is_featured
  )
  SELECT
    resolved_site_id,
    'image',
    CASE WHEN le.phase IN ('before', 'during', 'after') THEN le.phase ELSE 'during' END,
    'r2://' || le.r2_key,
    le.r2_key,
    le.message_id,
    FALSE
  FROM public.line_events AS le
  WHERE le.burst_id = p_burst_id
    AND le.r2_key IS NOT NULL
  ON CONFLICT (line_message_id) WHERE line_message_id IS NOT NULL
  DO UPDATE SET
    project_id = EXCLUDED.project_id,
    file_url = EXCLUDED.file_url,
    r2_key = EXCLUDED.r2_key;

  UPDATE public.line_events
  SET site_id = resolved_site_id,
      action = 'assign',
      confidence = 1,
      state = 'recorded',
      processed_at = NOW(),
      processing_started_at = NULL,
      correction_open_until = NULL
  WHERE burst_id = p_burst_id;

  UPDATE public.line_events
  SET site_id = NULL,
      action = 'ignore',
      confidence = 1,
      state = 'ignored',
      processed_at = NOW()
  WHERE id = p_answer_event_id;

  UPDATE public.projects
  SET last_line_activity_at = NOW()
  WHERE id = resolved_site_id;

  IF p_learn_alias AND p_observed_alias IS NOT NULL AND length(btrim(p_observed_alias)) > 0 THEN
    INSERT INTO public.site_aliases (site_id, alias, source)
    VALUES (resolved_site_id, btrim(p_observed_alias), 'correction')
    ON CONFLICT (site_id, alias) DO NOTHING;
  END IF;

  INSERT INTO public.correction_logs (
    line_event_id, original_site_id, site_id, observed_alias, log_type, details
  ) VALUES (
    p_answer_event_id,
    p_original_site_id,
    resolved_site_id,
    p_observed_alias,
    'correction',
    COALESCE(p_details, '{}'::JSONB)
  );

  RETURN resolved_site_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_line_burst_correction(UUID, TEXT, TEXT, UUID, TEXT, TEXT, UUID, BOOLEAN, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_line_burst_correction(UUID, TEXT, TEXT, UUID, TEXT, TEXT, UUID, BOOLEAN, JSONB) TO service_role;

INSERT INTO public.bot_templates (template_id, body, variables)
VALUES
  ('T-01', E'📁 {現場名}の写真{n}枚、記録しました（{工程}）\n現場ページ → {URL}\n※違う現場だったら、現場名だけ返信してください', ARRAY['現場名', 'n', '工程', 'URL']),
  ('T-02', E'{"with_candidates":"❓ この写真はどの現場ですか？\\n候補: ①{候補1} ②{候補2} ③{候補3}\\n番号か現場名で返信してください","without_candidates":"❓ この写真はどの現場ですか？\\n現場名を返信してください"}', ARRAY['候補1', '候補2', '候補3']),
  ('T-03', E'❓「{新しい名前}」は「{既存の現場名}」と同じ現場ですか？\n同じなら「はい」、別の現場なら「別」と返信してください', ARRAY['新しい名前', '既存の現場名']),
  ('T-04', E'🆕 新しい現場「{現場名}」を台帳に作りました\n現場ページ → {URL}\n以後この現場の写真は自動でここにまとまります', ARRAY['現場名', 'URL']),
  ('T-05', E'✏️ 「{誤った現場名}」→「{正しい現場名}」に直しました\nこの呼び方も覚えたので、次からは自動で振り分けます', ARRAY['誤った現場名', '正しい現場名']),
  ('T-06', E'📋 今週の現場（{期間}）\n【動いた現場】{n}件\n・{現場名} +{枚数}枚（{工程}）\n（…現場ぶん繰り返し）\n【完工候補】{完工候補} → 実績ページの下書きを作れます\n【{日数}日以上動きなし】{停滞現場}\n【今週の学習】{誤判定と訂正の要約}\n詳細 → {週報ページURL}', ARRAY['期間', 'n', '現場名', '枚数', '工程', '完工候補', '日数', '停滞現場', '誤判定と訂正の要約', '週報ページURL']),
  ('T-07', E'⚠️ 現場記録AIを一時停止しました\n理由: {エラー要約}\n写真は退避済みで失われていません。復旧はセッションで相談してください', ARRAY['エラー要約'])
ON CONFLICT (template_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.invalidate_bot_template_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.body IS DISTINCT FROM OLD.body OR NEW.variables IS DISTINCT FROM OLD.variables THEN
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invalidate_bot_template_approval_on_change ON public.bot_templates;
CREATE TRIGGER invalidate_bot_template_approval_on_change
  BEFORE UPDATE ON public.bot_templates
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_bot_template_approval();

-- 初期文面は承認前ドラフトのため approved_at / approved_by を意図的にNULLのままにする。
