import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth';
import { randomUUID } from 'crypto';
import {
  MEDIA_SIGNED_URL_TTL_SECONDS,
  PRIVATE_MEDIA_BUCKET,
  internalMediaUrl,
} from '@/lib/media-storage';
import { toStorageUploadBody } from '@/lib/storage-upload';

// 画像サイズ設定
const IMAGE_SIZES = {
  thumbnail: { width: 300, height: 300 },
  medium: { width: 800, height: 800 },
  large: { width: 1600, height: 1600 },
} as const;

// WebP品質設定
const WEBP_QUALITY = 80;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 50_000_000;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_IMAGE_FORMATS = new Set(['jpeg', 'png', 'webp']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ProcessedImages {
  thumbnail: { url: string; path: string };
  medium: { url: string; path: string };
  large: { url: string; path: string };
}

export async function POST(request: NextRequest) {
  try {
    // 大きなリクエストを読み込む前に、操作権限を確認する。
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

    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: '画像は20MB以下にしてください' },
        { status: 413 },
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'JPEG、PNG、WebP画像のみアップロードできます' },
        { status: 415 },
      );
    }

    const supabase = createAdminClient();
    const timestamp = Date.now();
    const randomStr = randomUUID().slice(0, 8);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const image = sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS });
    const metadata = await image.metadata();
    if (!metadata.format || !ALLOWED_IMAGE_FORMATS.has(metadata.format)) {
      return NextResponse.json(
        { error: '画像の内容を確認できませんでした' },
        { status: 415 },
      );
    }

    // 各サイズで画像を処理
    const processedImages: ProcessedImages = {
      thumbnail: { url: '', path: '' },
      medium: { url: '', path: '' },
      large: { url: '', path: '' },
    };

    const uploadedPaths: string[] = [];
    try {
      for (const [sizeName, dimensions] of Object.entries(IMAGE_SIZES)) {
        const size = sizeName as keyof typeof IMAGE_SIZES;

        // Sharpで画像をリサイズ＆WebP変換
        const processedBuffer = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS })
          .resize(dimensions.width, dimensions.height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer();

        // ファイルパスを生成（ランダム文字列で重複を防ぐ）
        const filePath = `${projectId}/${timestamp}_${randomStr}_${size}.webp`;

        // Supabase Storageにアップロード
        const { error: uploadError } = await supabase.storage
          .from(PRIVATE_MEDIA_BUCKET)
          .upload(filePath, toStorageUploadBody(processedBuffer), {
            contentType: 'image/webp',
            upsert: false,
          });

        if (uploadError) {
          console.error(`Upload error for ${size}:`, uploadError);
          throw new Error(`${size}サイズのアップロードに失敗しました`);
        }
        uploadedPaths.push(filePath);

        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(PRIVATE_MEDIA_BUCKET)
          .createSignedUrl(filePath, MEDIA_SIGNED_URL_TTL_SECONDS);
        if (signedUrlError) throw signedUrlError;

        processedImages[size] = {
          url: signedUrlData.signedUrl,
          path: filePath,
        };
      }
    } catch (uploadError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(PRIVATE_MEDIA_BUCKET).remove(uploadedPaths);
      }
      throw uploadError;
    }

    return NextResponse.json({
      success: true,
      images: processedImages,
      // 署名URLは直後の画面プレビュー専用。DBには下の固定パスを保存する。
      file_url: processedImages.medium.url,
      thumbnail_url: processedImages.thumbnail.url,
      large_url: processedImages.large.url,
      storage_bucket: PRIVATE_MEDIA_BUCKET,
      storage_path: processedImages.medium.path,
      thumbnail_storage_path: processedImages.thumbnail.path,
      large_storage_path: processedImages.large.path,
      internal_file_url: internalMediaUrl(processedImages.medium.path),
      internal_thumbnail_url: internalMediaUrl(processedImages.thumbnail.path),
    });
  } catch (error) {
    console.error('Image processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '画像処理に失敗しました' },
      { status: 500 }
    );
  }
}
