import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { PRIVATE_MEDIA_BUCKET } from '@/lib/media-storage';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { ProjectMedia } from '@/types/database';

type Params = Promise<{ id: string; mediaId: string }>;

export const dynamic = 'force-dynamic';

function isProjectMediaPath(projectId: string, path: string): boolean {
  return path.startsWith(`${projectId}/`) && !path.includes('../');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Params },
): Promise<NextResponse> {
  try {
    const { id, mediaId } = await params;
    const { user, error: authError } = await requirePermission('media:read');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }

    const variant = new URL(request.url).searchParams.get('variant') || 'thumbnail';
    if (variant !== 'file' && variant !== 'thumbnail') {
      return NextResponse.json({ error: '表示する画像の種類が正しくありません' }, { status: 400 });
    }

    // ログイン利用者のクライアントで検索し、RLSによる現場の閲覧制限を先に適用する。
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('project_media')
      .select(
        'id, project_id, type, private_storage_bucket, private_storage_path, private_thumbnail_path',
      )
      .eq('id', mediaId)
      .eq('project_id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '写真が見つかりません' }, { status: 404 });
    }

    const media = data as Pick<
      ProjectMedia,
      | 'id'
      | 'project_id'
      | 'type'
      | 'private_storage_bucket'
      | 'private_storage_path'
      | 'private_thumbnail_path'
    >;
    if (variant === 'file' && media.type !== 'image') {
      return NextResponse.json(
        { error: '動画はこの経路では表示できません' },
        { status: 400 },
      );
    }

    const storagePath = variant === 'thumbnail'
      ? media.private_thumbnail_path || media.private_storage_path
      : media.private_storage_path;
    const bucket = media.private_storage_bucket || PRIVATE_MEDIA_BUCKET;

    if (
      bucket !== PRIVATE_MEDIA_BUCKET
      || !storagePath
      || !isProjectMediaPath(id, storagePath)
    ) {
      return NextResponse.json(
        { error: 'この写真は安全な保管場所にありません' },
        { status: 409 },
      );
    }

    const admin = createAdminClient();
    const { data: file, error: downloadError } = await admin.storage
      .from(bucket)
      .download(storagePath);

    if (downloadError || !file) {
      console.error('Private media download error:', downloadError);
      return NextResponse.json({ error: '写真を読み込めませんでした' }, { status: 502 });
    }

    return new NextResponse(file, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Length': String(file.size),
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Private media content error:', error);
    return NextResponse.json({ error: '写真を読み込めませんでした' }, { status: 500 });
  }
}
