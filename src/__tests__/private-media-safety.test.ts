import fs from 'node:fs';
import path from 'node:path';
import {
  internalMediaUrl,
  preparePrivateMediaForBrowser,
  privateMediaViewerUrls,
  publicStoragePath,
  signPrivateMedia,
} from '@/lib/media-storage';
import type { ProjectMedia } from '@/types/database';

function source(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('現場写真の非公開保管', () => {
  const privateMedia: ProjectMedia = {
    id: 'media-id',
    project_id: 'project-id',
    type: 'image',
    phase: 'before',
    file_url: 'internal://project-media-private/project-id/photo.webp',
    thumbnail_url: 'internal://project-media-private/project-id/photo_thumbnail.webp',
    is_featured: true,
    private_storage_bucket: 'project-media-private',
    private_storage_path: 'project-id/photo.webp',
    private_thumbnail_path: 'project-id/photo_thumbnail.webp',
    created_at: '2026-07-23T00:00:00.000Z',
  };

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

  it('AI処理などで必要な非公開写真はファイルごとに署名する', async () => {
    const createSignedUrl = jest.fn(async (path: string) => ({
      data: { signedUrl: `https://example.supabase.co/signed/${path}?token=test` },
      error: null,
    }));
    const supabase = {
      storage: {
        from: jest.fn(() => ({ createSignedUrl })),
      },
    };

    await expect(signPrivateMedia(supabase as never, privateMedia)).resolves.toEqual(
      expect.objectContaining({
        file_url: 'https://example.supabase.co/signed/project-id/photo.webp?token=test',
        thumbnail_url: 'https://example.supabase.co/signed/project-id/photo_thumbnail.webp?token=test',
      }),
    );
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
  });

  it('通常の管理画面表示では署名を露出せず、認証付きの同一サイトURLを使う', async () => {
    expect(privateMediaViewerUrls(privateMedia)).toEqual(
      expect.objectContaining({
        file_url: '/api/projects/project-id/media/media-id/content?variant=file',
        thumbnail_url: '/api/projects/project-id/media/media-id/content?variant=thumbnail',
      }),
    );

    const createSignedUrl = jest.fn();
    const supabase = {
      storage: {
        from: jest.fn(() => ({ createSignedUrl })),
      },
    };
    await expect(
      preparePrivateMediaForBrowser(supabase as never, privateMedia),
    ).resolves.toEqual(
      expect.objectContaining({
        file_url: '/api/projects/project-id/media/media-id/content?variant=file',
        thumbnail_url: '/api/projects/project-id/media/media-id/content?variant=thumbnail',
      }),
    );
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('写真の配信時にログイン権限と現場の閲覧制限を再確認する', () => {
    const route = source('src/app/api/projects/[id]/media/[mediaId]/content/route.ts');
    expect(route).toContain("requirePermission('media:read')");
    expect(route).toContain('const supabase = await createClient()');
    expect(route).toContain(".eq('id', mediaId)");
    expect(route).toContain(".eq('project_id', id)");
    expect(route).toContain("bucket !== PRIVATE_MEDIA_BUCKET");
    expect(route).toContain('PRIVATE_MEDIA_VIEW_TTL_SECONDS = 60');
    expect(route).toContain('.createSignedUrl(storagePath, PRIVATE_MEDIA_VIEW_TTL_SECONDS)');
    expect(route).toContain('NextResponse.redirect(signedData.signedUrl, 307)');
    expect(route).not.toContain('.download(storagePath)');
    expect(route).toContain("'Cache-Control', 'private, no-store, max-age=0'");
  });

  it('署名に失敗した画像URLを管理画面へ渡さない', async () => {
    const createSignedUrl = jest.fn(async (path: string) => path.includes('thumbnail')
      ? { data: null, error: { message: 'not found' } }
      : {
        data: { signedUrl: `https://example.supabase.co/signed/${path}?token=test` },
        error: null,
      });
    const supabase = {
      storage: {
        from: jest.fn(() => ({ createSignedUrl })),
      },
    };

    await expect(signPrivateMedia(supabase as never, privateMedia)).resolves.toEqual(
      expect.objectContaining({
        file_url: 'https://example.supabase.co/signed/project-id/photo.webp?token=test',
        thumbnail_url: undefined,
      }),
    );
  });

  it('公開は明示操作でコピーし、非掲載化で公開コピーを削除する', () => {
    const route = source('src/app/api/projects/[id]/media/route.ts');
    expect(route).toContain('createPublicMediaCopy');
    expect(route).toContain('removePublicMediaCopies');
    expect(route).toContain("publication_status: is_featured ? 'internal' : 'published'");
  });

  it('写真を確認できない状態では掲載操作を無効にする', () => {
    const projectPage = source('src/app/(admin)/admin/projects/[id]/page.tsx');
    expect(projectPage).toContain("!reviewableMediaIds.has(mediaId)");
    expect(projectPage).toContain('写真を表示できていないため、掲載できません');
    expect(projectPage).toContain('写真を表示できません。再読み込みしてください');
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
