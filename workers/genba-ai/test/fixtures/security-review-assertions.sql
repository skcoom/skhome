DO $schema_assertions$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count
  FROM (
    VALUES
      ('public_title'),
      ('public_location'),
      ('public_reviewed_at'),
      ('public_reviewed_by')
  ) AS expected(column_name)
  LEFT JOIN information_schema.columns AS actual
    ON actual.table_schema = 'public'
    AND actual.table_name = 'projects'
    AND actual.column_name = expected.column_name
  WHERE actual.column_name IS NULL;
  IF row_count <> 0 THEN
    RAISE EXCEPTION '% public project columns are missing', row_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'project-documents'
      AND public = FALSE
      AND file_size_limit = 20971520
      AND allowed_mime_types = ARRAY['application/pdf']
  ) THEN
    RAISE EXCEPTION 'the private project-documents bucket contract is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects'
      AND policyname = 'Partners can view assigned projects'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_documents'
      AND policyname = 'Staff can manage project documents'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_members'
      AND policyname = 'Admins can manage project assignments'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders'
      AND policyname = 'orders_manage_staff'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_budgets'
      AND policyname = 'project_budgets_manage_admin'
  ) THEN
    RAISE EXCEPTION 'role-separated RLS policies are missing';
  END IF;

  IF has_table_privilege('anon', 'public.projects', 'SELECT')
    OR has_column_privilege('anon', 'public.projects', 'name', 'SELECT')
    OR has_column_privilege('anon', 'public.projects', 'address', 'SELECT')
    OR NOT has_column_privilege('anon', 'public.projects', 'public_title', 'SELECT')
    OR has_table_privilege('anon', 'public.project_media', 'SELECT')
    OR has_column_privilege('anon', 'public.project_media', 'uploaded_by', 'SELECT')
    OR NOT has_column_privilege('anon', 'public.project_media', 'file_url', 'SELECT')
  THEN
    RAISE EXCEPTION 'anonymous column grants expose management data';
  END IF;

  IF EXISTS (SELECT 1 FROM public.projects WHERE is_public = TRUE) THEN
    RAISE EXCEPTION 'previously public projects were not reset for human review';
  END IF;
END
$schema_assertions$;

DO $fixture_data$
DECLARE
  reviewer UUID;
  partner UUID;
  assigned_project UUID;
  other_project UUID;
  unassigned_public_project UUID;
BEGIN
  SELECT id INTO reviewer FROM public.users WHERE email = 'reviewer@example.test';
  SELECT id INTO partner FROM public.users WHERE email = 'partner@example.test';

  INSERT INTO public.projects (name, status)
  VALUES ('Partner assigned site', 'in_progress')
  RETURNING id INTO assigned_project;
  INSERT INTO public.projects (name, status)
  VALUES ('Other private site', 'in_progress')
  RETURNING id INTO other_project;
  INSERT INTO public.projects (name, status)
  VALUES ('Unassigned public site', 'completed')
  RETURNING id INTO unassigned_public_project;

  UPDATE public.projects
  SET public_title = '公開確認済みの施工事例',
      public_location = '福岡市',
      public_description = '公開専用の説明です。'
  WHERE id = assigned_project;
  UPDATE public.projects
  SET is_public = TRUE,
      public_reviewed_at = NOW(),
      public_reviewed_by = reviewer
  WHERE id = assigned_project;

  UPDATE public.projects
  SET public_title = '担当外の公開施工事例',
      public_location = '福岡市',
      public_description = '匿名利用者だけが閲覧する公開情報です。'
  WHERE id = unassigned_public_project;
  UPDATE public.projects
  SET is_public = TRUE,
      public_reviewed_at = NOW(),
      public_reviewed_by = reviewer
  WHERE id = unassigned_public_project;

  INSERT INTO public.project_members (project_id, user_id, created_by)
  VALUES (assigned_project, partner, reviewer);

  INSERT INTO public.project_media (
    project_id, type, phase, file_url, is_featured, source_origin, publication_status
  ) VALUES
    (assigned_project, 'image', 'after', 'https://example.test/published.jpg', FALSE, 'manual', 'published'),
    (assigned_project, 'image', 'during', 'internal://fixture', TRUE, 'line', 'internal'),
    (other_project, 'image', 'during', 'internal://other', TRUE, 'line', 'internal');
END
$fixture_data$;

BEGIN;
SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT auth_user_id::TEXT FROM public.users WHERE email = 'partner@example.test'),
  TRUE
);
SET LOCAL ROLE authenticated;
DO $partner_assertions$
DECLARE
  visible_assigned INTEGER;
  visible_other INTEGER;
  visible_budget INTEGER;
BEGIN
  SELECT COUNT(*) INTO visible_assigned FROM public.projects WHERE name = 'Partner assigned site';
  SELECT COUNT(*) INTO visible_other FROM public.projects WHERE name = 'Other private site';
  SELECT COUNT(*) INTO visible_budget FROM public.project_budgets;
  IF visible_assigned <> 1 OR visible_other <> 0 THEN
    RAISE EXCEPTION 'partner project access is not limited to assigned projects';
  END IF;
  IF visible_budget <> 0 THEN
    RAISE EXCEPTION 'partner can read project budgets';
  END IF;
END
$partner_assertions$;
ROLLBACK;

BEGIN;
SET LOCAL ROLE anon;
DO $anonymous_assertions$
DECLARE
  published_count INTEGER;
  internal_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO published_count
  FROM public.project_media WHERE file_url = 'https://example.test/published.jpg';
  SELECT COUNT(*) INTO internal_count
  FROM public.project_media WHERE file_url LIKE 'internal://%';
  IF published_count <> 1 OR internal_count <> 0 THEN
    RAISE EXCEPTION 'anonymous media access is not limited to published media';
  END IF;
END
$anonymous_assertions$;
ROLLBACK;

BEGIN;
SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT auth_user_id::TEXT FROM public.users WHERE email = 'partner@example.test'),
  TRUE
);
SET LOCAL ROLE authenticated;
DO $authenticated_public_assertions$
DECLARE
  unrelated_public INTEGER;
BEGIN
  SELECT COUNT(*) INTO unrelated_public
  FROM public.projects
  WHERE name = 'Unassigned public site';
  IF unrelated_public <> 0 THEN
    RAISE EXCEPTION 'authenticated partner can read an unassigned public project through the public policy';
  END IF;
END
$authenticated_public_assertions$;
ROLLBACK;

DO $main_media_assertion$
DECLARE
  project_id UUID;
  media_id UUID;
  remaining_main UUID;
BEGIN
  SELECT id INTO project_id FROM public.projects WHERE name = 'Partner assigned site';
  SELECT id INTO media_id FROM public.project_media WHERE file_url = 'https://example.test/published.jpg';
  UPDATE public.projects SET main_media_id = media_id WHERE id = project_id;
  UPDATE public.project_media
  SET is_featured = TRUE, publication_status = 'internal'
  WHERE id = media_id;
  SELECT main_media_id INTO remaining_main FROM public.projects WHERE id = project_id;
  IF remaining_main IS NOT NULL THEN
    RAISE EXCEPTION 'an unpublished photo remained configured as the public main image';
  END IF;
END
$main_media_assertion$;

DO $review_constraint_assertion$
BEGIN
  BEGIN
    UPDATE public.projects
    SET is_public = TRUE
    WHERE name = 'Other private site';
    RAISE EXCEPTION 'unreviewed project was published';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END
$review_constraint_assertion$;

SELECT 'security review migration assertions passed' AS result;
