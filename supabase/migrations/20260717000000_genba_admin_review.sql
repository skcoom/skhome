-- 現場管理AIの管理画面接続。R2原本は非公開のまま、公開候補と公開コピーを分離する。

BEGIN;

ALTER TABLE public.project_media
  ADD COLUMN IF NOT EXISTS source_origin TEXT CHECK (source_origin IN ('manual', 'line')),
  ADD COLUMN IF NOT EXISTS publication_status TEXT CHECK (publication_status IN ('internal', 'selected', 'published')),
  ADD COLUMN IF NOT EXISTS public_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

UPDATE public.project_media
SET
  source_origin = CASE WHEN genba_line_event_id IS NULL THEN 'manual' ELSE 'line' END,
  publication_status = CASE
    WHEN genba_line_event_id IS NOT NULL THEN 'internal'
    WHEN is_featured THEN 'internal'
    ELSE 'published'
  END
WHERE source_origin IS NULL OR publication_status IS NULL;

ALTER TABLE public.project_media
  ALTER COLUMN source_origin SET DEFAULT 'manual',
  ALTER COLUMN source_origin SET NOT NULL,
  ALTER COLUMN publication_status SET DEFAULT 'internal',
  ALTER COLUMN publication_status SET NOT NULL;

-- フェーズ1の既存RPCは追加列を指定しないため、LINE由来だけを自動補正する。
CREATE OR REPLACE FUNCTION public.normalize_genba_media_publication()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.genba_line_event_id IS NOT NULL THEN
    NEW.source_origin := 'line';
    IF TG_OP = 'INSERT' OR NEW.publication_status IS NULL THEN
      NEW.publication_status := 'internal';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_genba_media_publication ON public.project_media;
CREATE TRIGGER normalize_genba_media_publication
  BEFORE INSERT OR UPDATE OF genba_line_event_id ON public.project_media
  FOR EACH ROW EXECUTE FUNCTION public.normalize_genba_media_publication();

-- LINE側の訂正・再試行が、公開済みコピーを internal:// へ巻き戻さないよう保護する。
CREATE OR REPLACE FUNCTION public.protect_published_genba_media()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.source_origin = 'line'
    AND OLD.publication_status = 'published'
    AND NEW.publication_status = 'published' THEN
    NEW.file_url := OLD.file_url;
    NEW.public_storage_path := OLD.public_storage_path;
    NEW.is_featured := FALSE;
    NEW.published_at := OLD.published_at;
    NEW.published_by := OLD.published_by;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_published_genba_media ON public.project_media;
CREATE TRIGGER protect_published_genba_media
  BEFORE UPDATE OF file_url, is_featured, publication_status, public_storage_path
  ON public.project_media
  FOR EACH ROW EXECUTE FUNCTION public.protect_published_genba_media();

CREATE INDEX IF NOT EXISTS idx_project_media_publication_status
  ON public.project_media(publication_status, project_id);

CREATE TABLE IF NOT EXISTS public.genba_media_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_event_id UUID NOT NULL REFERENCES public.line_events(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'site_changed', 'phase_changed', 'selected', 'selection_removed', 'published', 'unpublished'
  )),
  before_state JSONB NOT NULL DEFAULT '{}'::JSONB,
  after_state JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_genba_media_reviews_event_created
  ON public.genba_media_reviews(line_event_id, created_at DESC);

ALTER TABLE public.genba_media_reviews ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.admin_review_genba_media(
  p_event_id UUID,
  p_reviewer_id UUID,
  p_site_id UUID,
  p_phase TEXT,
  p_publication_status TEXT
)
RETURNS public.project_media
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_before public.line_events;
  media_before public.project_media;
  media_after public.project_media;
BEGIN
  IF p_phase NOT IN ('before', 'during', 'after') THEN
    RAISE EXCEPTION 'invalid phase';
  END IF;
  IF p_publication_status NOT IN ('internal', 'selected') THEN
    RAISE EXCEPTION 'publishing requires the dedicated publish function';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_site_id) THEN
    RAISE EXCEPTION 'project was not found';
  END IF;

  SELECT * INTO event_before
  FROM public.line_events
  WHERE id = p_event_id
    AND r2_key IS NOT NULL
    AND state = 'recorded'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'recorded LINE media was not found';
  END IF;

  SELECT * INTO media_before
  FROM public.project_media
  WHERE genba_line_event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'project media ledger was not found';
  END IF;
  IF media_before.publication_status NOT IN ('internal', 'selected') THEN
    RAISE EXCEPTION 'published media must use the dedicated unpublish function';
  END IF;

  UPDATE public.line_events
  SET site_id = p_site_id,
      phase = p_phase,
      confidence = CASE
        WHEN site_id IS DISTINCT FROM p_site_id OR phase IS DISTINCT FROM p_phase THEN 1
        ELSE confidence
      END
  WHERE id = p_event_id;

  UPDATE public.project_media
  SET project_id = p_site_id,
      phase = p_phase,
      source_origin = 'line',
      publication_status = p_publication_status,
      is_featured = TRUE
  WHERE genba_line_event_id = p_event_id
  RETURNING * INTO media_after;

  IF event_before.site_id IS DISTINCT FROM p_site_id THEN
    INSERT INTO public.genba_media_reviews (
      line_event_id, reviewer_id, action, before_state, after_state
    ) VALUES (
      p_event_id, p_reviewer_id, 'site_changed',
      jsonb_build_object('site_id', event_before.site_id),
      jsonb_build_object('site_id', p_site_id)
    );
  END IF;

  IF event_before.phase IS DISTINCT FROM p_phase THEN
    INSERT INTO public.genba_media_reviews (
      line_event_id, reviewer_id, action, before_state, after_state
    ) VALUES (
      p_event_id, p_reviewer_id, 'phase_changed',
      jsonb_build_object('phase', event_before.phase),
      jsonb_build_object('phase', p_phase)
    );
  END IF;

  IF COALESCE(media_before.publication_status, 'internal') IS DISTINCT FROM p_publication_status THEN
    INSERT INTO public.genba_media_reviews (
      line_event_id, reviewer_id, action, before_state, after_state
    ) VALUES (
      p_event_id,
      p_reviewer_id,
      CASE WHEN p_publication_status = 'selected' THEN 'selected' ELSE 'selection_removed' END,
      jsonb_build_object('publication_status', media_before.publication_status),
      jsonb_build_object('publication_status', p_publication_status)
    );
  END IF;

  RETURN media_after;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_genba_media(UUID, UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_genba_media(UUID, UUID, UUID, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_publish_genba_media(
  p_event_id UUID,
  p_reviewer_id UUID,
  p_file_url TEXT,
  p_storage_path TEXT
)
RETURNS public.project_media
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  media_before public.project_media;
  media_after public.project_media;
BEGIN
  IF p_file_url !~ '^https://' OR length(btrim(p_storage_path)) = 0 THEN
    RAISE EXCEPTION 'a public HTTPS copy is required';
  END IF;

  SELECT * INTO media_before
  FROM public.project_media
  WHERE genba_line_event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND OR media_before.publication_status IS DISTINCT FROM 'selected' THEN
    RAISE EXCEPTION 'media must be selected before publishing';
  END IF;

  UPDATE public.project_media
  SET file_url = p_file_url,
      public_storage_path = p_storage_path,
      publication_status = 'published',
      source_origin = 'line',
      is_featured = FALSE,
      published_at = NOW(),
      published_by = p_reviewer_id
  WHERE genba_line_event_id = p_event_id
  RETURNING * INTO media_after;

  INSERT INTO public.genba_media_reviews (
    line_event_id, reviewer_id, action, before_state, after_state
  ) VALUES (
    p_event_id,
    p_reviewer_id,
    'published',
    jsonb_build_object('publication_status', media_before.publication_status),
    jsonb_build_object(
      'publication_status', media_after.publication_status,
      'public_storage_path', media_after.public_storage_path
    )
  );

  RETURN media_after;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_publish_genba_media(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_publish_genba_media(UUID, UUID, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_unpublish_genba_media(
  p_event_id UUID,
  p_reviewer_id UUID
)
RETURNS public.project_media
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  media_before public.project_media;
  media_after public.project_media;
BEGIN
  SELECT * INTO media_before
  FROM public.project_media
  WHERE genba_line_event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND OR media_before.publication_status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'only published media can be unpublished';
  END IF;

  UPDATE public.project_media
  SET file_url = 'internal://genba-ai',
      public_storage_path = NULL,
      publication_status = 'internal',
      is_featured = TRUE,
      published_at = NULL,
      published_by = NULL
  WHERE genba_line_event_id = p_event_id
  RETURNING * INTO media_after;

  INSERT INTO public.genba_media_reviews (
    line_event_id, reviewer_id, action, before_state, after_state
  ) VALUES (
    p_event_id,
    p_reviewer_id,
    'unpublished',
    jsonb_build_object(
      'publication_status', media_before.publication_status,
      'public_storage_path', media_before.public_storage_path
    ),
    jsonb_build_object('publication_status', media_after.publication_status)
  );

  RETURN media_after;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_unpublish_genba_media(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_unpublish_genba_media(UUID, UUID) TO service_role;

-- partnerを含むログイン利用者の閲覧は維持しつつ、直接更新はadmin/staffだけに絞る。
DROP POLICY IF EXISTS "Authenticated users can manage media" ON public.project_media;
DROP POLICY IF EXISTS "Authenticated users can view media" ON public.project_media;
DROP POLICY IF EXISTS "Staff can manage media" ON public.project_media;
CREATE POLICY "Authenticated users can view media" ON public.project_media
  FOR SELECT TO authenticated USING (
    genba_line_event_id IS NULL
    OR publication_status = 'published'
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );
CREATE POLICY "Staff can manage media" ON public.project_media
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- 匿名閲覧は、公開現場かつ明示的に公開された写真だけに限定する。
DROP POLICY IF EXISTS "Public project media is viewable" ON public.project_media;
CREATE POLICY "Public project media is viewable" ON public.project_media
  FOR SELECT TO anon USING (
    is_featured = FALSE
    AND (genba_line_event_id IS NULL OR publication_status = 'published')
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND is_public = TRUE
    )
  );

COMMIT;
