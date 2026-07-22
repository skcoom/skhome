ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;
UPDATE public.users SET auth_user_id = id WHERE auth_user_id IS NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS public_description TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS main_media_id UUID REFERENCES public.project_media(id) ON DELETE SET NULL;

ALTER TABLE public.project_media
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.before_after_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  before_media_id UUID NOT NULL REFERENCES public.project_media(id) ON DELETE CASCADE,
  after_media_id UUID NOT NULL REFERENCES public.project_media(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  label TEXT,
  alignment_settings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT 'draft'
);
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS public.suppliers (id UUID PRIMARY KEY DEFAULT uuid_generate_v4());
CREATE TABLE IF NOT EXISTS public.orders (id UUID PRIMARY KEY DEFAULT uuid_generate_v4());
CREATE TABLE IF NOT EXISTS public.order_items (id UUID PRIMARY KEY DEFAULT uuid_generate_v4());
CREATE TABLE IF NOT EXISTS public.labor_records (id UUID PRIMARY KEY DEFAULT uuid_generate_v4());
CREATE TABLE IF NOT EXISTS public.project_budgets (id UUID PRIMARY KEY DEFAULT uuid_generate_v4());
CREATE TABLE IF NOT EXISTS public.additional_work_templates (id UUID PRIMARY KEY DEFAULT uuid_generate_v4());
CREATE TABLE IF NOT EXISTS public.project_additional_works (id UUID PRIMARY KEY DEFAULT uuid_generate_v4());
CREATE TABLE IF NOT EXISTS public.system_settings (id UUID PRIMARY KEY DEFAULT uuid_generate_v4());

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.before_after_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.additional_work_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_additional_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  public BOOLEAN NOT NULL DEFAULT FALSE,
  file_size_limit BIGINT,
  allowed_mime_types TEXT[]
);
CREATE TABLE IF NOT EXISTS storage.objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bucket_id TEXT NOT NULL
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.projects, public.project_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
