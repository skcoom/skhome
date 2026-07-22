import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth';
import { randomUUID } from 'crypto';

const IMAGE_SIZES = {
  thumbnail: { width: 400, height: 300 },
  featured: { width: 1200, height: 630 },
} as const;

const WEBP_QUALITY = 85;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 50_000_000;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_IMAGE_FORMATS = new Set(['jpeg', 'png', 'webp']);

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission('blog:write');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
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
        { status: 415 }
      );
    }

    const supabase = await createClient();
    const timestamp = Date.now();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const metadata = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
    if (!metadata.format || !ALLOWED_IMAGE_FORMATS.has(metadata.format)) {
      return NextResponse.json(
        { error: '画像の内容を確認できませんでした' },
        { status: 415 },
      );
    }

    const processedUrls: { thumbnail: string; featured: string } = {
      thumbnail: '',
      featured: '',
    };

    const uploadedPaths: string[] = [];
    const randomId = randomUUID().slice(0, 8);
    try {
      for (const [sizeName, dimensions] of Object.entries(IMAGE_SIZES)) {
        const size = sizeName as keyof typeof IMAGE_SIZES;

        const processedBuffer = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS })
          .resize(dimensions.width, dimensions.height, {
            fit: 'cover',
            position: 'center',
          })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer();

        const filePath = `blog/${timestamp}_${randomId}_${size}.webp`;

        const { error: uploadError } = await supabase.storage
          .from('project-media')
          .upload(filePath, processedBuffer, {
            contentType: 'image/webp',
            upsert: false,
          });

        if (uploadError) {
          console.error(`Upload error for ${size}:`, uploadError);
          throw new Error(`${size}サイズのアップロードに失敗しました`);
        }
        uploadedPaths.push(filePath);

        const { data: publicUrlData } = supabase.storage
          .from('project-media')
          .getPublicUrl(filePath);

        processedUrls[size] = publicUrlData.publicUrl;
      }
    } catch (uploadError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('project-media').remove(uploadedPaths);
      }
      throw uploadError;
    }

    return NextResponse.json({
      success: true,
      featured_image: processedUrls.featured,
      thumbnail: processedUrls.thumbnail,
    });
  } catch (error) {
    console.error('Blog image upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '画像アップロードに失敗しました' },
      { status: 500 }
    );
  }
}
