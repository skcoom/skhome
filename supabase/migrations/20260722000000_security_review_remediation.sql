BEGIN;

-- =====================================================
-- 公開施工実績: 管理用情報と公開用情報を分離する
-- =====================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS public_title TEXT,
  ADD COLUMN IF NOT EXISTS public_location TEXT,
  ADD COLUMN IF NOT EXISTS public_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.projects.public_title IS '施工実績に表示する匿名化済みの公開用案件名';
COMMENT ON COLUMN public.projects.public_location IS '施工実績に表示してよい市区町村程度の公開用地域名';
COMMENT ON COLUMN public.projects.public_reviewed_at IS '公開項目を人が最終確認した日時';

-- 既存案件は管理用情報が混ざっている可能性があるため、再確認までは公開しない。
UPDATE public.projects
SET
  is_public = FALSE,
  public_reviewed_at = NULL,
  public_reviewed_by = NULL
WHERE is_public = TRUE;

CREATE OR REPLACE FUNCTION public.reset_project_public_review()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF
    OLD.public_title IS DISTINCT FROM NEW.public_title
    OR OLD.public_location IS DISTINCT FROM NEW.public_location
    OR OLD.public_description IS DISTINCT FROM NEW.public_description
  THEN
    NEW.is_public := FALSE;
    NEW.public_reviewed_at := NULL;
    NEW.public_reviewed_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reset_project_public_review_on_content_change ON public.projects;
CREATE TRIGGER reset_project_public_review_on_content_change
  BEFORE UPDATE OF public_title, public_location, public_description
  ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_project_public_review();

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_public_content_reviewed;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_public_content_reviewed CHECK (
    is_public = FALSE
    OR (
      NULLIF(BTRIM(public_title), '') IS NOT NULL
      AND NULLIF(BTRIM(public_description), '') IS NOT NULL
      AND public_reviewed_at IS NOT NULL
      AND public_reviewed_by IS NOT NULL
    )
  );

-- =====================================================
-- 役割判定と担当現場
-- =====================================================

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.users
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  ORDER BY CASE WHEN id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.users
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  ORDER BY CASE WHEN id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_app_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_app_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_app_role() IN ('admin', 'staff'), FALSE)
$$;

REVOKE ALL ON FUNCTION public.is_app_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_staff() TO authenticated;

CREATE TABLE IF NOT EXISTS public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_user_id
  ON public.project_members(user_id, project_id);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;

DROP POLICY IF EXISTS "Project members can view own assignments" ON public.project_members;
DROP POLICY IF EXISTS "Staff can manage project assignments" ON public.project_members;
DROP POLICY IF EXISTS "Admins can manage project assignments" ON public.project_members;
CREATE POLICY "Project members can view own assignments" ON public.project_members
  FOR SELECT TO authenticated
  USING (user_id = public.current_app_user_id() OR public.is_app_staff());
CREATE POLICY "Admins can manage project assignments" ON public.project_members
  FOR ALL TO authenticated
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

CREATE OR REPLACE FUNCTION public.admin_set_project_members(
  p_project_id UUID,
  p_created_by UUID,
  p_user_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'project was not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM UNNEST(COALESCE(p_user_ids, ARRAY[]::UUID[])) AS requested(user_id)
    LEFT JOIN public.users account
      ON account.id = requested.user_id AND account.role = 'partner'
    WHERE account.id IS NULL
  ) THEN
    RAISE EXCEPTION 'only partner accounts can be assigned';
  END IF;

  DELETE FROM public.project_members WHERE project_id = p_project_id;
  INSERT INTO public.project_members (project_id, user_id, created_by)
  SELECT p_project_id, requested.user_id, p_created_by
  FROM (
    SELECT DISTINCT user_id
    FROM UNNEST(COALESCE(p_user_ids, ARRAY[]::UUID[])) AS member(user_id)
  ) AS requested;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_project_members(UUID, UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_project_members(UUID, UUID, UUID[]) TO service_role;

-- =====================================================
-- 利用者・現場・写真・進捗のRLS
-- =====================================================

DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR auth_user_id = auth.uid());
CREATE POLICY "Admins can manage users" ON public.users
  FOR ALL TO authenticated
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

DROP POLICY IF EXISTS "Authenticated users can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Public projects are viewable by everyone" ON public.projects;
DROP POLICY IF EXISTS "Staff can view projects" ON public.projects;
DROP POLICY IF EXISTS "Partners can view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Staff can create projects" ON public.projects;
DROP POLICY IF EXISTS "Staff can update projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
CREATE POLICY "Staff can view projects" ON public.projects
  FOR SELECT TO authenticated
  USING (public.is_app_staff());
CREATE POLICY "Partners can view assigned projects" ON public.projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_members membership
      WHERE membership.project_id = projects.id
        AND membership.user_id = public.current_app_user_id()
    )
  );
CREATE POLICY "Public projects are viewable by everyone" ON public.projects
  FOR SELECT TO anon
  USING (is_public = TRUE AND public_reviewed_at IS NOT NULL);
CREATE POLICY "Staff can create projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_app_staff());
CREATE POLICY "Staff can update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.is_app_staff())
  WITH CHECK (public.is_app_staff());
CREATE POLICY "Admins can delete projects" ON public.projects
  FOR DELETE TO authenticated
  USING (public.current_app_role() = 'admin');

DROP POLICY IF EXISTS "Authenticated users can manage media" ON public.project_media;
DROP POLICY IF EXISTS "Authenticated users can view media" ON public.project_media;
DROP POLICY IF EXISTS "Staff can manage media" ON public.project_media;
DROP POLICY IF EXISTS "Partners can view assigned media" ON public.project_media;
DROP POLICY IF EXISTS "Public project media is viewable" ON public.project_media;
CREATE POLICY "Staff can manage media" ON public.project_media
  FOR ALL TO authenticated
  USING (public.is_app_staff())
  WITH CHECK (public.is_app_staff());
CREATE POLICY "Partners can view assigned media" ON public.project_media
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_members membership
      WHERE membership.project_id = project_media.project_id
        AND membership.user_id = public.current_app_user_id()
    )
  );
CREATE POLICY "Public project media is viewable" ON public.project_media
  FOR SELECT TO anon
  USING (
    is_featured = FALSE
    AND publication_status = 'published'
    AND EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = project_media.project_id
        AND projects.is_public = TRUE
        AND projects.public_reviewed_at IS NOT NULL
    )
  );

CREATE OR REPLACE FUNCTION public.clear_unpublished_main_media()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_featured = TRUE OR NEW.publication_status IS DISTINCT FROM 'published' THEN
    UPDATE public.projects
    SET main_media_id = NULL
    WHERE id = NEW.project_id AND main_media_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_unpublished_main_media ON public.project_media;
CREATE TRIGGER clear_unpublished_main_media
  AFTER UPDATE OF is_featured, publication_status
  ON public.project_media
  FOR EACH ROW
  WHEN (
    NEW.is_featured IS DISTINCT FROM OLD.is_featured
    OR NEW.publication_status IS DISTINCT FROM OLD.publication_status
  )
  EXECUTE FUNCTION public.clear_unpublished_main_media();

DROP POLICY IF EXISTS "Authenticated users can manage progress" ON public.project_progress;
DROP POLICY IF EXISTS "Staff can manage progress" ON public.project_progress;
DROP POLICY IF EXISTS "Partners can view assigned progress" ON public.project_progress;
CREATE POLICY "Staff can manage progress" ON public.project_progress
  FOR ALL TO authenticated
  USING (public.is_app_staff())
  WITH CHECK (public.is_app_staff());
CREATE POLICY "Partners can view assigned progress" ON public.project_progress
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_members membership
      WHERE membership.project_id = project_progress.project_id
        AND membership.user_id = public.current_app_user_id()
    )
  );

-- ビフォーアフター表は一部環境で管理画面から先に作られているため、存在する場合だけ保護する。
DO $before_after_policies$
BEGIN
  IF to_regclass('public.before_after_pairs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.before_after_pairs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can manage before-after pairs" ON public.before_after_pairs';
    EXECUTE 'DROP POLICY IF EXISTS "Staff can manage before-after pairs" ON public.before_after_pairs';
    EXECUTE 'DROP POLICY IF EXISTS "Partners can view assigned before-after pairs" ON public.before_after_pairs';
    EXECUTE 'DROP POLICY IF EXISTS "Public can view published before-after pairs" ON public.before_after_pairs';
    EXECUTE $policy$
      CREATE POLICY "Staff can manage before-after pairs" ON public.before_after_pairs
        FOR ALL TO authenticated
        USING (public.is_app_staff())
        WITH CHECK (public.is_app_staff())
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Partners can view assigned before-after pairs" ON public.before_after_pairs
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.project_members membership
            WHERE membership.project_id = before_after_pairs.project_id
              AND membership.user_id = public.current_app_user_id()
          )
        )
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "Public can view published before-after pairs" ON public.before_after_pairs
        FOR SELECT TO anon
        USING (
          EXISTS (
            SELECT 1 FROM public.projects project
            WHERE project.id = before_after_pairs.project_id
              AND project.is_public = TRUE
              AND project.public_reviewed_at IS NOT NULL
          )
          AND EXISTS (
            SELECT 1 FROM public.project_media media
            WHERE media.id = before_after_pairs.before_media_id
              AND media.publication_status = 'published'
              AND media.is_featured = FALSE
          )
          AND EXISTS (
            SELECT 1 FROM public.project_media media
            WHERE media.id = before_after_pairs.after_media_id
              AND media.publication_status = 'published'
              AND media.is_featured = FALSE
          )
        )
    $policy$;
  END IF;
END
$before_after_policies$;

-- RLSは行を保護する仕組みなので、匿名利用者が公開行の管理用列まで直接取得できないよう
-- テーブル単位のSELECT権限を取り消し、公開ページで使う列だけを許可する。
REVOKE SELECT ON TABLE public.projects FROM anon;
GRANT SELECT (
  id,
  public_title,
  public_location,
  public_description,
  tags,
  status,
  start_date,
  end_date,
  is_public,
  main_media_id,
  created_at,
  updated_at,
  public_reviewed_at
) ON TABLE public.projects TO anon;

REVOKE SELECT ON TABLE public.project_media FROM anon;
GRANT SELECT (
  id,
  project_id,
  type,
  phase,
  file_url,
  thumbnail_url,
  caption,
  is_featured,
  publication_status,
  created_at
) ON TABLE public.project_media TO anon;

DO $before_after_grants$
BEGIN
  IF to_regclass('public.before_after_pairs') IS NOT NULL THEN
    EXECUTE 'REVOKE SELECT ON TABLE public.before_after_pairs FROM anon';
    EXECUTE 'GRANT SELECT (id, project_id, before_media_id, after_media_id, display_order, label, alignment_settings, created_at) ON TABLE public.before_after_pairs TO anon';
  END IF;
END
$before_after_grants$;

-- =====================================================
-- ブログ・問い合わせ・書類のRLS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can manage blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON public.blog_posts;
CREATE POLICY "Staff can manage blog posts" ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.is_app_staff())
  WITH CHECK (public.is_app_staff());
CREATE POLICY "Published posts are viewable by everyone" ON public.blog_posts
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON public.contacts;
DROP POLICY IF EXISTS "Anyone can insert contacts" ON public.contacts;
CREATE POLICY "Staff can manage contacts" ON public.contacts
  FOR ALL TO authenticated
  USING (public.is_app_staff())
  WITH CHECK (public.is_app_staff());
CREATE POLICY "Anyone can insert contacts" ON public.contacts
  FOR INSERT TO anon, authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Authenticated users can view project documents" ON public.project_documents;
DROP POLICY IF EXISTS "Authenticated users can insert project documents" ON public.project_documents;
DROP POLICY IF EXISTS "Authenticated users can update project documents" ON public.project_documents;
DROP POLICY IF EXISTS "Authenticated users can delete project documents" ON public.project_documents;
CREATE POLICY "Staff can manage project documents" ON public.project_documents
  FOR ALL TO authenticated
  USING (public.is_app_staff())
  WITH CHECK (public.is_app_staff());

-- =====================================================
-- 原価・発注情報は協力会社から分離する
-- =====================================================

DROP POLICY IF EXISTS "suppliers_select_authenticated" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert_admin_staff" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update_admin_staff" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_delete_admin_staff" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_manage_staff" ON public.suppliers;
CREATE POLICY "suppliers_select_staff" ON public.suppliers
  FOR SELECT TO authenticated USING (public.is_app_staff());
CREATE POLICY "suppliers_manage_staff" ON public.suppliers
  FOR ALL TO authenticated
  USING (public.is_app_staff())
  WITH CHECK (public.is_app_staff());

DROP POLICY IF EXISTS "orders_select_authenticated" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_admin_staff" ON public.orders;
DROP POLICY IF EXISTS "orders_update_admin_staff" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_admin_staff" ON public.orders;
DROP POLICY IF EXISTS "orders_manage_staff" ON public.orders;
CREATE POLICY "orders_select_staff" ON public.orders
  FOR SELECT TO authenticated USING (public.is_app_staff());
CREATE POLICY "orders_manage_staff" ON public.orders
  FOR ALL TO authenticated
  USING (public.is_app_staff())
  WITH CHECK (public.is_app_staff());

DROP POLICY IF EXISTS "order_items_select_authenticated" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_admin_staff" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update_admin_staff" ON public.order_items;
DROP POLICY IF EXISTS "order_items_delete_admin_staff" ON public.order_items;
DROP POLICY IF EXISTS "order_items_manage_staff" ON public.order_items;
CREATE POLICY "order_items_select_staff" ON public.order_items
  FOR SELECT TO authenticated USING (public.is_app_staff());
CREATE POLICY "order_items_manage_staff" ON public.order_items
  FOR ALL TO authenticated
  USING (public.is_app_staff())
  WITH CHECK (public.is_app_staff());

DROP POLICY IF EXISTS "labor_records_select_authenticated" ON public.labor_records;
DROP POLICY IF EXISTS "labor_records_insert_admin_staff" ON public.labor_records;
DROP POLICY IF EXISTS "labor_records_update_admin_staff" ON public.labor_records;
DROP POLICY IF EXISTS "labor_records_delete_admin_staff" ON public.labor_records;
DROP POLICY IF EXISTS "labor_records_manage_staff" ON public.labor_records;
CREATE POLICY "labor_records_select_staff" ON public.labor_records
  FOR SELECT TO authenticated USING (public.is_app_staff());
CREATE POLICY "labor_records_manage_staff" ON public.labor_records
  FOR ALL TO authenticated
  USING (public.is_app_staff())
  WITH CHECK (public.is_app_staff());

DROP POLICY IF EXISTS "project_budgets_select_authenticated" ON public.project_budgets;
DROP POLICY IF EXISTS "project_budgets_insert_admin" ON public.project_budgets;
DROP POLICY IF EXISTS "project_budgets_update_admin" ON public.project_budgets;
DROP POLICY IF EXISTS "project_budgets_delete_admin" ON public.project_budgets;
DROP POLICY IF EXISTS "project_budgets_manage_admin" ON public.project_budgets;
CREATE POLICY "project_budgets_select_admin" ON public.project_budgets
  FOR SELECT TO authenticated USING (public.current_app_role() = 'admin');
CREATE POLICY "project_budgets_manage_admin" ON public.project_budgets
  FOR ALL TO authenticated
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

DROP POLICY IF EXISTS "additional_work_templates_select_authenticated" ON public.additional_work_templates;
DROP POLICY IF EXISTS "additional_work_templates_insert_admin_staff" ON public.additional_work_templates;
DROP POLICY IF EXISTS "additional_work_templates_update_admin_staff" ON public.additional_work_templates;
DROP POLICY IF EXISTS "additional_work_templates_delete_admin_staff" ON public.additional_work_templates;
DROP POLICY IF EXISTS "additional_work_templates_manage_staff" ON public.additional_work_templates;
CREATE POLICY "additional_work_templates_select_staff" ON public.additional_work_templates
  FOR SELECT TO authenticated USING (public.is_app_staff());
CREATE POLICY "additional_work_templates_manage_staff" ON public.additional_work_templates
  FOR ALL TO authenticated
  USING (public.is_app_staff())
  WITH CHECK (public.is_app_staff());

DROP POLICY IF EXISTS "project_additional_works_select_authenticated" ON public.project_additional_works;
DROP POLICY IF EXISTS "project_additional_works_insert_admin_staff" ON public.project_additional_works;
DROP POLICY IF EXISTS "project_additional_works_update_admin_staff" ON public.project_additional_works;
DROP POLICY IF EXISTS "project_additional_works_delete_admin_staff" ON public.project_additional_works;
DROP POLICY IF EXISTS "project_additional_works_manage_staff" ON public.project_additional_works;
CREATE POLICY "project_additional_works_select_staff" ON public.project_additional_works
  FOR SELECT TO authenticated USING (public.is_app_staff());
CREATE POLICY "project_additional_works_manage_staff" ON public.project_additional_works
  FOR ALL TO authenticated
  USING (public.is_app_staff())
  WITH CHECK (public.is_app_staff());

DROP POLICY IF EXISTS "system_settings_select_authenticated" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_update_admin" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_manage_admin" ON public.system_settings;
CREATE POLICY "system_settings_select_admin" ON public.system_settings
  FOR SELECT TO authenticated USING (public.current_app_role() = 'admin');
CREATE POLICY "system_settings_manage_admin" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

-- =====================================================
-- Storage: 公開メディアと非公開書類を分離する
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-documents',
  'project-documents',
  FALSE,
  20971520,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.project_documents
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT NOT NULL DEFAULT 'project-documents',
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload project media" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update project media" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete project media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view project media" ON storage.objects;
DROP POLICY IF EXISTS "Staff can manage project documents" ON storage.objects;

CREATE POLICY "Staff can upload project media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-media' AND public.is_app_staff());
CREATE POLICY "Staff can update project media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'project-media' AND public.is_app_staff())
  WITH CHECK (bucket_id = 'project-media' AND public.is_app_staff());
CREATE POLICY "Staff can delete project media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'project-media' AND public.is_app_staff());
CREATE POLICY "Public can view project media" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'project-media');
CREATE POLICY "Staff can manage project documents" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'project-documents' AND public.is_app_staff())
  WITH CHECK (bucket_id = 'project-documents' AND public.is_app_staff());

COMMIT;
