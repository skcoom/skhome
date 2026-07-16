DO $assertions$
DECLARE
  reviewer UUID;
  target_site UUID;
  target_event UUID;
  internal_event UUID;
  media_row public.project_media;
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count
  FROM (
    VALUES
      ('source_origin', 'text', 'NO'),
      ('publication_status', 'text', 'NO'),
      ('public_storage_path', 'text', 'YES'),
      ('published_at', 'timestamptz', 'YES'),
      ('published_by', 'uuid', 'YES')
  ) AS expected(column_name, udt_name, is_nullable)
  LEFT JOIN information_schema.columns AS actual
    ON actual.table_schema = 'public'
    AND actual.table_name = 'project_media'
    AND actual.column_name = expected.column_name
  WHERE actual.column_name IS NULL
    OR actual.udt_name IS DISTINCT FROM expected.udt_name
    OR actual.is_nullable IS DISTINCT FROM expected.is_nullable;
  IF row_count <> 0 THEN
    RAISE EXCEPTION '% admin media columns have a missing or unexpected contract', row_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class AS table_row
    JOIN pg_namespace AS namespace_row ON namespace_row.oid = table_row.relnamespace
    WHERE namespace_row.nspname = 'public'
      AND table_row.relname = 'genba_media_reviews'
      AND table_row.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'genba_media_reviews must have RLS enabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_media'
      AND policyname = 'Authenticated users can view media'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_media'
      AND policyname = 'Staff can manage media'
  ) THEN
    RAISE EXCEPTION 'authenticated media access was not separated into read and staff-write policies';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'admin_review_genba_media'
      AND grantee = 'PUBLIC'
      AND privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'admin_review_genba_media must not be executable by PUBLIC';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.admin_review_genba_media(uuid,uuid,uuid,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute admin_review_genba_media';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'admin_publish_genba_media'
      AND grantee = 'PUBLIC'
      AND privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'admin_publish_genba_media must not be executable by PUBLIC';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'admin_unpublish_genba_media'
      AND grantee = 'PUBLIC'
      AND privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'admin_unpublish_genba_media must not be executable by PUBLIC';
  END IF;

  INSERT INTO public.users (email, name, role)
  VALUES ('reviewer@example.test', 'Fixture Reviewer', 'staff')
  RETURNING id INTO reviewer;
  INSERT INTO public.users (email, name, role)
  VALUES ('partner@example.test', 'Fixture Partner', 'partner');

  SELECT id INTO target_site FROM public.projects WHERE name = 'サンプル現場A';
  UPDATE public.projects SET is_public = TRUE WHERE id = target_site;
  SELECT id INTO target_event FROM public.line_events WHERE message_id = 'fixture-image-assign';

  SELECT * INTO media_row
  FROM public.project_media
  WHERE genba_line_event_id = target_event;
  IF media_row.source_origin IS DISTINCT FROM 'line'
    OR media_row.publication_status IS DISTINCT FROM 'internal'
    OR media_row.is_featured IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'existing LINE media was not backfilled as private internal media';
  END IF;

  SELECT * INTO media_row FROM public.admin_review_genba_media(
    target_event, reviewer, target_site, 'before', 'selected'
  );
  IF media_row.publication_status IS DISTINCT FROM 'selected'
    OR media_row.phase IS DISTINCT FROM 'before'
    OR media_row.is_featured IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'review did not keep the selected photo private';
  END IF;

  SELECT * INTO media_row FROM public.admin_publish_genba_media(
    target_event,
    reviewer,
    'https://example.test/storage/published.jpg',
    'genba-public/fixture/published.jpg'
  );
  IF media_row.publication_status IS DISTINCT FROM 'published'
    OR media_row.is_featured IS DISTINCT FROM FALSE
    OR media_row.public_storage_path IS NULL
    OR media_row.published_by IS DISTINCT FROM reviewer THEN
    RAISE EXCEPTION 'published media was not recorded with its public copy and reviewer';
  END IF;
  BEGIN
    PERFORM public.admin_review_genba_media(
      target_event, reviewer, target_site, 'during', 'selected'
    );
    RAISE EXCEPTION 'published media was moved back without the unpublish workflow';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'published media must use the dedicated unpublish function' THEN
        RAISE;
      END IF;
  END;

  PERFORM public.record_line_burst(
    'fixture-burst-assign', target_site, 'assign', 'after', 0.910, NULL
  );
  SELECT * INTO media_row
  FROM public.project_media
  WHERE genba_line_event_id = target_event;
  IF media_row.publication_status IS DISTINCT FROM 'published'
    OR media_row.is_featured IS DISTINCT FROM FALSE
    OR media_row.file_url IS DISTINCT FROM 'https://example.test/storage/published.jpg' THEN
    RAISE EXCEPTION 'a Phase 1 replay rolled back an explicitly published copy';
  END IF;

  INSERT INTO public.line_events (
    message_id, event_type, source_type, source_id, raw_payload, r2_key, content_type,
    site_id, action, phase, confidence, state
  ) VALUES (
    'fixture-private-after-admin-migration', 'message:image', 'group', 'fixture-group',
    '{}'::JSONB, 'raw/fixture/stays-private', 'image/jpeg', target_site, 'assign', 'during', 0.95, 'recorded'
  ) RETURNING id INTO internal_event;
  INSERT INTO public.project_media (
    project_id, type, phase, file_url, genba_line_event_id, is_featured
  ) VALUES (
    target_site, 'image', 'during', 'internal://genba-ai', internal_event, TRUE
  ) RETURNING * INTO media_row;
  IF media_row.source_origin IS DISTINCT FROM 'line'
    OR media_row.publication_status IS DISTINCT FROM 'internal' THEN
    RAISE EXCEPTION 'future Phase 1 LINE inserts are not normalized to private media';
  END IF;

  SELECT COUNT(*) INTO row_count
  FROM public.genba_media_reviews
  WHERE line_event_id = target_event AND action IN ('phase_changed', 'selected', 'published');
  IF row_count <> 3 THEN
    RAISE EXCEPTION 'expected three review audit entries, got %', row_count;
  END IF;
END
$assertions$;

BEGIN;
SET LOCAL ROLE anon;
DO $rls_assertions$
DECLARE
  published_count INTEGER;
  private_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO published_count
  FROM public.project_media
  WHERE file_url = 'https://example.test/storage/published.jpg';
  SELECT COUNT(*) INTO private_count
  FROM public.project_media
  WHERE file_url = 'internal://genba-ai';
  IF published_count <> 1 THEN
    RAISE EXCEPTION 'anonymous users cannot read explicitly published media';
  END IF;
  IF private_count <> 0 THEN
    RAISE EXCEPTION 'anonymous users can read internal LINE media';
  END IF;
END
$rls_assertions$;
ROLLBACK;

BEGIN;
SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT id::TEXT FROM public.users WHERE email = 'partner@example.test'),
  TRUE
);
SET LOCAL ROLE authenticated;
DO $partner_assertions$
DECLARE
  published_count INTEGER;
  private_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO published_count
  FROM public.project_media
  WHERE file_url = 'https://example.test/storage/published.jpg';
  SELECT COUNT(*) INTO private_count
  FROM public.project_media
  WHERE file_url = 'internal://genba-ai';
  IF published_count <> 1 OR private_count <> 0 THEN
    RAISE EXCEPTION 'partner media access exposed an internal LINE ledger row';
  END IF;
END
$partner_assertions$;
ROLLBACK;

BEGIN;
SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT id::TEXT FROM public.users WHERE email = 'reviewer@example.test'),
  TRUE
);
SET LOCAL ROLE authenticated;
DO $staff_assertions$
DECLARE
  private_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO private_count
  FROM public.project_media
  WHERE file_url = 'internal://genba-ai';
  IF private_count < 1 THEN
    RAISE EXCEPTION 'staff cannot read internal LINE ledger rows';
  END IF;
END
$staff_assertions$;
ROLLBACK;

DO $unpublish_assertions$
DECLARE
  reviewer UUID;
  target_event UUID;
  media_row public.project_media;
BEGIN
  SELECT id INTO reviewer FROM public.users WHERE email = 'reviewer@example.test';
  SELECT id INTO target_event FROM public.line_events WHERE message_id = 'fixture-image-assign';
  SELECT * INTO media_row FROM public.admin_unpublish_genba_media(target_event, reviewer);
  IF media_row.publication_status IS DISTINCT FROM 'internal'
    OR media_row.is_featured IS DISTINCT FROM TRUE
    OR media_row.file_url IS DISTINCT FROM 'internal://genba-ai'
    OR media_row.public_storage_path IS NOT NULL THEN
    RAISE EXCEPTION 'unpublish did not restore the private LINE ledger state';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.genba_media_reviews
    WHERE line_event_id = target_event AND action = 'unpublished'
  ) THEN
    RAISE EXCEPTION 'unpublish audit entry is missing';
  END IF;
END
$unpublish_assertions$;
