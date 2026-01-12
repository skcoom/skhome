import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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

    if (!projectId) {
      return NextResponse.json(
        { error: 'プロジェクトIDが指定されていません' },
        { status: 400 }
      );
    }

    // 動画ファイルかどうかチェック
    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: '動画ファイルではありません' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const timestamp = Date.now();
    const randomStr = randomUUID().slice(0, 8);

    // 動画をSupabase Storageにアップロード
    const fileExt = file.name.split('.').pop() || 'mp4';
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

        if (!thumbUploadError) {
          const { data: thumbUrlData } = supabase.storage
            .from('project-media')
            .getPublicUrl(thumbnailFileName);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      } catch {
        console.warn('サムネイルのアップロードをスキップ');
      }
    }

    return NextResponse.json({
      success: true,
      file_url: videoUrlData.publicUrl,
      thumbnail_url: thumbnailUrl,
    });
  } catch (error) {
    console.error('Video processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '動画処理に失敗しました' },
      { status: 500 }
    );
  }
}
