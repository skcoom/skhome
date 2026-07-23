BEGIN;

-- 管理画面から登録する写真・動画は非公開バケットを原本とし、
-- 公開を承認したものだけ project-media にコピーする。
ALTER TABLE public.project_media
  ADD COLUMN IF NOT EXISTS private_storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS private_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS private_thumbnail_path TEXT,
  ADD COLUMN IF NOT EXISTS private_large_path TEXT,
  ADD COLUMN IF NOT EXISTS public_thumbnail_path TEXT;

ALTER TABLE public.project_media
  ADD CONSTRAINT project_media_private_bucket_check
    CHECK (private_storage_bucket IS NULL OR private_storage_bucket = 'project-media-private'),
  ADD CONSTRAINT project_media_private_path_check
    CHECK (
      private_storage_path IS NULL
      OR (
        private_storage_path LIKE project_id::TEXT || '/%'
        AND position('../' IN private_storage_path) = 0
      )
    ),
  ADD CONSTRAINT project_media_private_thumbnail_path_check
    CHECK (
      private_thumbnail_path IS NULL
      OR (
        private_thumbnail_path LIKE project_id::TEXT || '/%'
        AND position('../' IN private_thumbnail_path) = 0
      )
    ),
  ADD CONSTRAINT project_media_private_large_path_check
    CHECK (
      private_large_path IS NULL
      OR (
        private_large_path LIKE project_id::TEXT || '/%'
        AND position('../' IN private_large_path) = 0
      )
    );

COMMENT ON COLUMN public.project_media.private_storage_bucket IS '社内用原本を保存する非公開Storageバケット';
COMMENT ON COLUMN public.project_media.private_storage_path IS '社内用原本（画面表示用）の非公開Storageパス';
COMMENT ON COLUMN public.project_media.private_thumbnail_path IS '社内用サムネイルの非公開Storageパス';
COMMENT ON COLUMN public.project_media.private_large_path IS '社内用高解像度画像の非公開Storageパス';
COMMENT ON COLUMN public.project_media.public_thumbnail_path IS '公開承認後にproject-mediaへ作成したサムネイルのパス';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-media-private',
  'project-media-private',
  FALSE,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Staff can view private project media" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload private project media" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update private project media" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete private project media" ON storage.objects;

CREATE POLICY "Staff can view private project media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'project-media-private' AND public.is_app_staff());
CREATE POLICY "Staff can upload private project media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-media-private' AND public.is_app_staff());
CREATE POLICY "Staff can update private project media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'project-media-private' AND public.is_app_staff())
  WITH CHECK (bucket_id = 'project-media-private' AND public.is_app_staff());
CREATE POLICY "Staff can delete private project media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'project-media-private' AND public.is_app_staff());

COMMIT;
