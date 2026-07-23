import fs from 'node:fs';
import path from 'node:path';
import { internalMediaUrl, publicStoragePath } from '@/lib/media-storage';

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('現場写真の非公開保管', () => {
  it('管理画面用の固定値は公開URLにならない', () => {
    expect(internalMediaUrl('project-id/photo.webp')).toBe(
      'internal://project-media-private/project-id/photo.webp',
    );
  });

  it('project-mediaバケット直下の正式URLだけからパスを取得する', () => {
    expect(publicStoragePath(
      'https://example.supabase.co/storage/v1/object/public/project-media/project-id/a%20b.webp',
    )).toBe('project-id/a b.webp');
    expect(publicStoragePath(
      'https://example.supabase.co/other/storage/v1/object/public/project-media/project-id/photo.webp',
    )).toBeNull();
    expect(publicStoragePath('not-a-url')).toBeNull();
  });

  it('非公開バケットとスタッフ限定ポリシーを作成する', () => {
    const migration = source('supabase/migrations/20260723000000_private_project_media.sql');
    expect(migration).toContain("'project-media-private'");
    expect(migration).toContain('FALSE');
    expect(migration).toContain('Staff can view private project media');
    expect(migration).toContain('public.is_app_staff()');
    expect(migration).toContain('project_media_private_path_check');
    expect(migration).toContain("private_storage_path LIKE project_id::TEXT || '/%'");
    expect(migration).toContain("IF NOT EXISTS (\n    SELECT 1 FROM pg_constraint");
  });

  it('画像・動画の新規登録で公開URLを発行しない', () => {
    for (const relativePath of [
      'src/app/api/media/process/route.ts',
      'src/app/api/media/video/route.ts',
    ]) {
      const code = source(relativePath);
      expect(code).toContain('PRIVATE_MEDIA_BUCKET');
      expect(code).toContain('.createSignedUrl(');
      expect(code).not.toContain('.getPublicUrl(');
    }
  });

  it('公開は明示操作でコピーし、非掲載化で公開コピーを削除する', () => {
    const route = source('src/app/api/projects/[id]/media/route.ts');
    expect(route).toContain('createPublicMediaCopy');
    expect(route).toContain('removePublicMediaCopies');
    expect(route).toContain("publication_status: is_featured ? 'internal' : 'published'");
  });

  it('移行と重複ユーザー整理はドライランが初期値', () => {
    const mediaMigration = source('scripts/migrate-project-media.mjs');
    const userCleanup = source('scripts/cleanup-test-users.mjs');
    expect(mediaMigration).toContain("const apply = process.argv.includes('--apply')");
    expect(mediaMigration).toContain("mode: 'dry-run'");
    expect(userCleanup).toContain("const apply = process.argv.includes('--apply')");
    expect(userCleanup).toContain("confirmation !== email");
    expect(userCleanup).toContain('関連データがあるため削除できません');
  });

  it('LINE写真の件数と公開候補は選択中の現場だけを対象にする', () => {
    const board = source('src/components/admin/genba-review-board.tsx');
    expect(board).toContain('const projectItems = useMemo(');
    expect(board).toContain('const selectedItems = projectItems.filter(');
    expect(board).toContain('all: projectItems.length');
  });
});
