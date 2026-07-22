import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';
import { requirePermission } from '@/lib/auth';

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;
const VIDEO_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, error: authError } = await requirePermission('media:write');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const thumbnailBlob = formData.get('thumbnail') as Blob | null;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      );
    }

    if (!projectId || !UUID_PATTERN.test(projectId)) {
      return NextResponse.json(
        { error: '正しい現場IDを指定してください' },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { error: '動画は50MB以下にしてください' },
        { status: 413 },
      );
    }

    const fileExt = VIDEO_TYPES[file.type];
    if (!fileExt) {
      return NextResponse.json(
        { error: 'MP4またはWebM動画のみアップロードできます' },
        { status: 415 }
      );
    }

    if (thumbnailBlob && thumbnailBlob.size > MAX_THUMBNAIL_BYTES) {
      return NextResponse.json(
        { error: 'サムネイル画像は5MB以下にしてください' },
        { status: 413 },
      );
    }

    const supabase = createAdminClient();
    const timestamp = Date.now();
    const randomStr = randomUUID().slice(0, 8);

    // 動画をSupabase Storageにアップロード
    const videoFileName = `${projectId}/${timestamp}_${randomStr}.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: videoUploadError } = await supabase.storage
      .from('project-media')
      .upload(videoFileName, buffer, {
        contentType: file.type,
      });

    if (videoUploadError) {
      throw new Error(`動画アップロードに失敗しました: ${videoUploadError.message}`);
    }

    const { data: videoUrlData } = supabase.storage
      .from('project-media')
      .getPublicUrl(videoFileName);

    // サムネイルをアップロード（クライアントから送信された場合）
    let thumbnailUrl: string | null = null;
    if (thumbnailBlob && thumbnailBlob.size > 0) {
      try {
        const thumbnailFileName = `${projectId}/${timestamp}_${randomStr}_thumb.jpg`;

        const thumbArrayBuffer = await thumbnailBlob.arrayBuffer();
        const thumbBuffer = Buffer.from(thumbArrayBuffer);

        const { error: thumbUploadError } = await supabase.storage
          .from('project-media')
          .upload(thumbnailFileName, thumbBuffer, {
            contentType: 'image/jpeg',
          });

        if (thumbUploadError) {
          console.error('[VideoAPI] Thumbnail upload error:', thumbUploadError);
        } else {
          const { data: thumbUrlData } = supabase.storage
            .from('project-media')
            .getPublicUrl(thumbnailFileName);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      } catch (err) {
        console.error('[VideoAPI] Thumbnail upload exception:', err);
      }
    }

    const responseData = {
      success: true,
      file_url: videoUrlData.publicUrl,
      thumbnail_url: thumbnailUrl,
    };
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Video processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '動画処理に失敗しました' },
      { status: 500 }
    );
  }
}
