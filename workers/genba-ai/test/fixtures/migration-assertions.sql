DO $assertions$
DECLARE
  old_site UUID;
  new_site UUID;
  created_site UUID;
  text_event UUID;
  answer_event UUID;
  result_site UUID;
  returned_count INTEGER;
  row_count INTEGER;
BEGIN
  IF current_setting('server_version_num')::INTEGER / 10000 <> 15 THEN
    RAISE EXCEPTION 'expected PostgreSQL 15, got %', version();
  END IF;

  SELECT COUNT(*) INTO row_count
  FROM (
    VALUES
      ('site_aliases', 'site_id', 'uuid', 'NO'),
      ('site_aliases', 'alias', 'text', 'NO'),
      ('site_aliases', 'source', 'text', 'NO'),
      ('site_aliases', 'created_at', 'timestamptz', 'NO'),
      ('bot_templates', 'template_id', 'text', 'NO'),
      ('bot_templates', 'body', 'text', 'NO'),
      ('bot_templates', 'variables', '_text', 'NO'),
      ('bot_templates', 'approved_at', 'timestamptz', 'YES'),
      ('bot_templates', 'approved_by', 'text', 'YES'),
      ('line_events', 'message_id', 'text', 'NO'),
      ('line_events', 'raw_payload', 'jsonb', 'NO'),
      ('line_events', 'r2_key', 'text', 'YES'),
      ('line_events', 'site_id', 'uuid', 'YES'),
      ('line_events', 'state', 'text', 'NO'),
      ('line_events', 'attempt_count', 'int4', 'NO'),
      ('correction_logs', 'line_event_id', 'uuid', 'YES'),
      ('correction_logs', 'original_site_id', 'uuid', 'YES'),
      ('correction_logs', 'site_id', 'uuid', 'YES'),
      ('correction_logs', 'log_type', 'text', 'NO'),
      ('correction_logs', 'details', 'jsonb', 'NO'),
      ('correction_logs', 'created_at', 'timestamptz', 'NO')
  ) AS expected(table_name, column_name, udt_name, is_nullable)
  LEFT JOIN information_schema.columns AS actual
    ON actual.table_schema = 'public'
    AND actual.table_name = expected.table_name
    AND actual.column_name = expected.column_name
  WHERE actual.column_name IS NULL
    OR actual.udt_name IS DISTINCT FROM expected.udt_name
    OR actual.is_nullable IS DISTINCT FROM expected.is_nullable;
  IF row_count <> 0 THEN
    RAISE EXCEPTION '% required genba AI columns have a missing or unexpected type/nullability', row_count;
  END IF;

  SELECT COUNT(*) INTO row_count
  FROM (
    VALUES
      ('site_aliases', 'site_id', 'projects', 'id'),
      ('line_events', 'site_id', 'projects', 'id'),
      ('project_media', 'genba_line_event_id', 'line_events', 'id'),
      ('correction_logs', 'line_event_id', 'line_events', 'id'),
      ('correction_logs', 'original_site_id', 'projects', 'id'),
      ('correction_logs', 'site_id', 'projects', 'id')
  ) AS expected(table_name, column_name, referenced_table, referenced_column)
  LEFT JOIN (
    SELECT
      source_table.relname AS table_name,
      source_column.attname AS column_name,
      target_table.relname AS referenced_table,
      target_column.attname AS referenced_column
    FROM pg_constraint AS constraint_row
    JOIN pg_class AS source_table ON source_table.oid = constraint_row.conrelid
    JOIN pg_namespace AS source_namespace ON source_namespace.oid = source_table.relnamespace
    JOIN pg_attribute AS source_column
      ON source_column.attrelid = source_table.oid
      AND source_column.attnum = constraint_row.conkey[1]
    JOIN pg_class AS target_table ON target_table.oid = constraint_row.confrelid
    JOIN pg_attribute AS target_column
      ON target_column.attrelid = target_table.oid
      AND target_column.attnum = constraint_row.confkey[1]
    WHERE constraint_row.contype = 'f'
      AND source_namespace.nspname = 'public'
  ) AS actual
    ON actual.table_name = expected.table_name
    AND actual.column_name = expected.column_name
    AND actual.referenced_table = expected.referenced_table
    AND actual.referenced_column = expected.referenced_column
  WHERE actual.table_name IS NULL;
  IF row_count <> 0 THEN
    RAISE EXCEPTION '% required genba AI foreign keys are missing', row_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_row
    JOIN pg_class AS table_row ON table_row.oid = constraint_row.conrelid
    JOIN pg_namespace AS namespace_row ON namespace_row.oid = table_row.relnamespace
    WHERE namespace_row.nspname = 'public'
      AND table_row.relname = 'line_events'
      AND constraint_row.contype = 'u'
      AND pg_get_constraintdef(constraint_row.oid) = 'UNIQUE (message_id)'
  ) THEN
    RAISE EXCEPTION 'line_events.message_id must be unique for webhook idempotency';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'last_line_activity_at'
  ) THEN
    RAISE EXCEPTION 'projects.last_line_activity_at was not added';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_media'
      AND column_name = 'genba_line_event_id'
  ) THEN
    RAISE EXCEPTION 'project_media.genba_line_event_id was not added';
  END IF;

  SELECT COUNT(*) INTO row_count FROM public.bot_templates;
  IF row_count <> 8 THEN
    RAISE EXCEPTION 'expected 8 bot templates, got %', row_count;
  END IF;

  SELECT COUNT(*) INTO row_count
  FROM public.bot_templates
  WHERE approved_at IS NULL AND approved_by IS NULL;
  IF row_count <> 8 THEN
    RAISE EXCEPTION 'all bot templates must start unapproved';
  END IF;

  SELECT COUNT(*) INTO row_count
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('site_aliases', 'bot_templates', 'line_events', 'correction_logs')
    AND c.relrowsecurity;
  IF row_count <> 4 THEN
    RAISE EXCEPTION 'all four internal tables must have RLS enabled';
  END IF;

  UPDATE public.bot_templates
  SET approved_at = NOW(), approved_by = 'fixture-reviewer'
  WHERE template_id = 'photo_auto';
  UPDATE public.bot_templates
  SET body = body || E'\n'
  WHERE template_id = 'photo_auto';
  IF EXISTS (
    SELECT 1 FROM public.bot_templates
    WHERE template_id = 'photo_auto'
      AND (approved_at IS NOT NULL OR approved_by IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'template content change did not invalidate approval';
  END IF;

  INSERT INTO public.projects (name, status, is_public)
  VALUES ('サンプル現場A', 'in_progress', FALSE)
  RETURNING id INTO old_site;
  INSERT INTO public.projects (name, status, is_public)
  VALUES ('サンプル現場B', 'in_progress', FALSE)
  RETURNING id INTO new_site;

  SELECT COUNT(*) INTO returned_count
  FROM public.register_line_events_batch(
    jsonb_build_array(
      jsonb_build_object(
        'message_id', 'fixture-image-assign',
        'webhook_event_id', 'fixture-webhook-image-assign',
        'event_type', 'message:image',
        'source_type', 'group',
        'source_id', 'fixture-group',
        'sender_id', 'fixture-sender',
        'raw_payload', jsonb_build_object('fixture', TRUE),
        'r2_key', 'raw/fixture/image-assign',
        'content_type', 'image/jpeg',
        'burst_id', 'fixture-burst-assign',
        'state', 'archived',
        'received_at', '2026-07-14T00:00:00Z'
      ),
      jsonb_build_object(
        'message_id', 'fixture-text-progress',
        'webhook_event_id', 'fixture-webhook-text-progress',
        'event_type', 'message:text',
        'source_type', 'group',
        'source_id', 'fixture-group',
        'sender_id', 'fixture-sender',
        'raw_payload', jsonb_build_object('fixture', TRUE),
        'text_content', '工程メモ',
        'state', 'received',
        'received_at', '2026-07-14T00:01:00Z'
      )
    )
  );
  IF returned_count <> 2 THEN
    RAISE EXCEPTION 'first batch registration returned %, expected 2', returned_count;
  END IF;

  SELECT COUNT(*) INTO returned_count
  FROM public.register_line_events_batch(
    jsonb_build_array(
      jsonb_build_object(
        'message_id', 'fixture-image-assign',
        'webhook_event_id', 'fixture-webhook-image-assign',
        'event_type', 'message:image',
        'source_type', 'group',
        'source_id', 'fixture-group',
        'sender_id', 'fixture-sender',
        'raw_payload', jsonb_build_object('fixture', TRUE),
        'r2_key', 'raw/fixture/image-assign',
        'content_type', 'image/jpeg',
        'burst_id', 'fixture-burst-assign',
        'state', 'archived',
        'received_at', '2026-07-14T00:00:00Z'
      ),
      jsonb_build_object(
        'message_id', 'fixture-text-progress',
        'webhook_event_id', 'fixture-webhook-text-progress',
        'event_type', 'message:text',
        'source_type', 'group',
        'source_id', 'fixture-group',
        'sender_id', 'fixture-sender',
        'raw_payload', jsonb_build_object('fixture', TRUE),
        'text_content', '工程メモ',
        'state', 'received',
        'received_at', '2026-07-14T00:01:00Z'
      )
    )
  );
  IF returned_count <> 0 THEN
    RAISE EXCEPTION 'duplicate batch returned %, expected 0', returned_count;
  END IF;

  SELECT COUNT(*) INTO row_count FROM public.line_events;
  IF row_count <> 2 THEN
    RAISE EXCEPTION 'message_id idempotency failed, got % rows', row_count;
  END IF;

  PERFORM public.record_line_burst(
    'fixture-burst-assign', old_site, 'assign', 'after', 0.910, NULL
  );
  PERFORM public.record_line_burst(
    'fixture-burst-assign', old_site, 'assign', 'after', 0.910, NULL
  );
  SELECT COUNT(*) INTO row_count
  FROM public.project_media
  WHERE project_id = old_site AND phase = 'after';
  IF row_count <> 1 THEN
    RAISE EXCEPTION 'record_line_burst is not idempotent, got % media rows', row_count;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.line_events
    WHERE message_id = 'fixture-image-assign'
      AND state = 'recorded'
      AND site_id = old_site
      AND action = 'assign'
  ) THEN
    RAISE EXCEPTION 'record_line_burst did not record the image event';
  END IF;

  SELECT id INTO text_event
  FROM public.line_events
  WHERE message_id = 'fixture-text-progress';
  PERFORM public.record_line_text(
    text_event, old_site, 'assign', 'during', 0.900, NULL, '工程メモ'
  );
  IF NOT EXISTS (
    SELECT 1 FROM public.project_progress
    WHERE project_id = old_site
      AND date = DATE '2026-07-14'
      AND description = '工程メモ'
  ) THEN
    RAISE EXCEPTION 'record_line_text did not create project progress';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.line_events
    WHERE id = text_event
      AND state = 'recorded'
      AND site_id = old_site
      AND action = 'assign'
      AND phase = 'during'
      AND processing_started_at IS NULL
  ) THEN
    RAISE EXCEPTION 'record_line_text did not finalize the text event';
  END IF;

  PERFORM public.register_line_events_batch(
    jsonb_build_array(
      jsonb_build_object(
        'message_id', 'fixture-image-correct',
        'webhook_event_id', 'fixture-webhook-image-correct',
        'event_type', 'message:image',
        'source_type', 'group',
        'source_id', 'fixture-group',
        'sender_id', 'fixture-sender',
        'raw_payload', jsonb_build_object('fixture', TRUE),
        'r2_key', 'raw/fixture/image-correct',
        'content_type', 'image/jpeg',
        'burst_id', 'fixture-burst-correct',
        'state', 'archived',
        'received_at', '2026-07-14T00:02:00Z'
      )
    )
  );
  PERFORM public.record_line_burst(
    'fixture-burst-correct', old_site, 'assign', 'during', 0.900, NULL
  );
  UPDATE public.line_events
  SET correction_open_until = NOW() + INTERVAL '30 minutes'
  WHERE burst_id = 'fixture-burst-correct';

  PERFORM public.register_line_events_batch(
    jsonb_build_array(
      jsonb_build_object(
        'message_id', 'fixture-answer-correct',
        'webhook_event_id', 'fixture-webhook-answer-correct',
        'event_type', 'message:text',
        'source_type', 'group',
        'source_id', 'fixture-group',
        'sender_id', 'fixture-sender',
        'raw_payload', jsonb_build_object('fixture', TRUE),
        'text_content', '訂正 サンプル現場B',
        'state', 'received',
        'received_at', '2026-07-14T00:03:00Z'
      )
    )
  );
  SELECT id INTO answer_event
  FROM public.line_events
  WHERE message_id = 'fixture-answer-correct';
  SELECT public.resolve_line_burst_correction(
    answer_event,
    'fixture-burst-correct',
    'recorded',
    new_site,
    NULL,
    'サンプル現場B',
    old_site,
    TRUE,
    jsonb_build_object('fixture', TRUE)
  ) INTO result_site;
  IF result_site IS DISTINCT FROM new_site THEN
    RAISE EXCEPTION 'valid correction returned the wrong site';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.project_media AS pm
    JOIN public.line_events AS le ON le.id = pm.genba_line_event_id
    WHERE le.message_id = 'fixture-image-correct'
      AND pm.project_id = new_site
      AND le.site_id = new_site
      AND le.state = 'recorded'
      AND le.correction_open_until IS NULL
  ) THEN
    RAISE EXCEPTION 'valid correction did not move image and ledger together';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.line_events
    WHERE id = answer_event
      AND state = 'ignored'
      AND action = 'ignore'
      AND site_id IS NULL
  ) THEN
    RAISE EXCEPTION 'valid correction did not finalize its answer event';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.correction_logs
    WHERE line_event_id = answer_event
      AND original_site_id = old_site
      AND site_id = new_site
      AND log_type = 'correction'
  ) THEN
    RAISE EXCEPTION 'valid correction was not logged';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.site_aliases
    WHERE site_id = new_site
      AND alias = 'サンプル現場B'
      AND source = 'correction'
  ) THEN
    RAISE EXCEPTION 'valid correction alias was not learned';
  END IF;

  PERFORM public.register_line_events_batch(
    jsonb_build_array(
      jsonb_build_object(
        'message_id', 'fixture-image-expired',
        'webhook_event_id', 'fixture-webhook-image-expired',
        'event_type', 'message:image',
        'source_type', 'group',
        'source_id', 'fixture-group',
        'sender_id', 'fixture-sender',
        'raw_payload', jsonb_build_object('fixture', TRUE),
        'r2_key', 'raw/fixture/image-expired',
        'content_type', 'image/jpeg',
        'burst_id', 'fixture-burst-expired',
        'state', 'archived',
        'received_at', '2026-07-14T00:04:00Z'
      )
    )
  );
  PERFORM public.record_line_burst(
    'fixture-burst-expired', old_site, 'assign', 'during', 0.900, NULL
  );
  UPDATE public.line_events
  SET correction_open_until = NOW() - INTERVAL '1 minute'
  WHERE burst_id = 'fixture-burst-expired';

  PERFORM public.register_line_events_batch(
    jsonb_build_array(
      jsonb_build_object(
        'message_id', 'fixture-answer-expired',
        'webhook_event_id', 'fixture-webhook-answer-expired',
        'event_type', 'message:text',
        'source_type', 'group',
        'source_id', 'fixture-group',
        'sender_id', 'fixture-sender',
        'raw_payload', jsonb_build_object('fixture', TRUE),
        'text_content', '訂正 サンプル現場B',
        'state', 'received',
        'received_at', '2026-07-14T00:05:00Z'
      )
    )
  );
  SELECT id INTO answer_event
  FROM public.line_events
  WHERE message_id = 'fixture-answer-expired';
  SELECT public.resolve_line_burst_correction(
    answer_event,
    'fixture-burst-expired',
    'recorded',
    new_site,
    NULL,
    'サンプル現場B',
    old_site,
    FALSE,
    jsonb_build_object('fixture', TRUE)
  ) INTO result_site;
  IF result_site IS NOT NULL THEN
    RAISE EXCEPTION 'expired correction must return null';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.project_media AS pm
    JOIN public.line_events AS le ON le.id = pm.genba_line_event_id
    WHERE le.message_id = 'fixture-image-expired'
      AND pm.project_id = old_site
      AND le.site_id = old_site
  ) THEN
    RAISE EXCEPTION 'expired correction changed the recorded site';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.line_events
    WHERE id = answer_event
      AND state = 'processing'
      AND action IS NULL
  ) THEN
    RAISE EXCEPTION 'expired correction unexpectedly consumed its answer event';
  END IF;

  PERFORM public.register_line_events_batch(
    jsonb_build_array(
      jsonb_build_object(
        'message_id', 'fixture-image-create',
        'webhook_event_id', 'fixture-webhook-image-create',
        'event_type', 'message:image',
        'source_type', 'group',
        'source_id', 'fixture-group',
        'sender_id', 'fixture-sender',
        'raw_payload', jsonb_build_object('fixture', TRUE),
        'r2_key', 'raw/fixture/image-create',
        'content_type', 'image/jpeg',
        'burst_id', 'fixture-burst-create',
        'state', 'archived',
        'received_at', '2026-07-14T00:06:00Z'
      )
    )
  );
  UPDATE public.line_events
  SET state = 'awaiting_confirmation',
      action = 'create',
      phase = 'during',
      new_site_name = 'サンプル新規現場'
  WHERE burst_id = 'fixture-burst-create';

  PERFORM public.register_line_events_batch(
    jsonb_build_array(
      jsonb_build_object(
        'message_id', 'fixture-answer-create-reject',
        'webhook_event_id', 'fixture-webhook-answer-create-reject',
        'event_type', 'message:text',
        'source_type', 'group',
        'source_id', 'fixture-group',
        'sender_id', 'fixture-sender',
        'raw_payload', jsonb_build_object('fixture', TRUE),
        'text_content', 'はいです',
        'state', 'received',
        'received_at', '2026-07-14T00:06:30Z'
      )
    )
  );
  SELECT id INTO answer_event
  FROM public.line_events
  WHERE message_id = 'fixture-answer-create-reject';
  BEGIN
    PERFORM public.resolve_line_burst_correction(
      answer_event,
      'fixture-burst-create',
      'awaiting_confirmation',
      NULL,
      'サンプル新規現場',
      NULL,
      NULL,
      FALSE,
      jsonb_build_object('fixture', TRUE)
    );
    RAISE EXCEPTION 'non-exact affirmative answer was accepted';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'new sites require an explicit affirmative answer' THEN
        RAISE;
      END IF;
  END;
  IF EXISTS (
    SELECT 1 FROM public.projects WHERE name = 'サンプル新規現場'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.line_events
    WHERE burst_id = 'fixture-burst-create'
      AND state = 'awaiting_confirmation'
      AND site_id IS NULL
  ) THEN
    RAISE EXCEPTION 'rejected new-site answer changed persistent state';
  END IF;

  PERFORM public.register_line_events_batch(
    jsonb_build_array(
      jsonb_build_object(
        'message_id', 'fixture-answer-create',
        'webhook_event_id', 'fixture-webhook-answer-create',
        'event_type', 'message:text',
        'source_type', 'group',
        'source_id', 'fixture-group',
        'sender_id', 'fixture-sender',
        'raw_payload', jsonb_build_object('fixture', TRUE),
        'text_content', 'はい',
        'state', 'received',
        'received_at', '2026-07-14T00:07:00Z'
      )
    )
  );
  SELECT id INTO answer_event
  FROM public.line_events
  WHERE message_id = 'fixture-answer-create';
  SELECT public.resolve_line_burst_correction(
    answer_event,
    'fixture-burst-create',
    'awaiting_confirmation',
    NULL,
    'サンプル新規現場',
    NULL,
    NULL,
    FALSE,
    jsonb_build_object('fixture', TRUE)
  ) INTO created_site;
  IF created_site IS NULL THEN
    RAISE EXCEPTION 'explicit affirmative answer did not create a site';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = created_site
      AND name = 'サンプル新規現場'
      AND status = 'in_progress'
      AND is_public = FALSE
  ) THEN
    RAISE EXCEPTION 'created site must be internal and in progress';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.project_media AS pm
    JOIN public.line_events AS le ON le.id = pm.genba_line_event_id
    WHERE le.message_id = 'fixture-image-create'
      AND pm.project_id = created_site
      AND le.site_id = created_site
      AND le.state = 'recorded'
  ) THEN
    RAISE EXCEPTION 'confirmed new site did not receive the image';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.line_events
    WHERE id = answer_event
      AND state = 'ignored'
      AND action = 'ignore'
      AND site_id IS NULL
  ) THEN
    RAISE EXCEPTION 'new-site confirmation did not finalize its answer event';
  END IF;

  RAISE NOTICE 'migration contract assertions passed';
END
$assertions$;
