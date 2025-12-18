-- ストレージバケットの作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-media',
  'project-media',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- ストレージポリシー: 認証済みユーザーはアップロード可能
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-media');

-- ストレージポリシー: 誰でも閲覧可能（パブリックバケット）
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'project-media');

-- ストレージポリシー: 認証済みユーザーは削除可能
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
CREATE POLICY "Authenticated users can delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'project-media');
