import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';

const IMAGE_SIZES = {
  thumbnail: { width: 400, height: 300 },
  featured: { width: 1200, height: 630 },
} as const;

const WEBP_QUALITY = 85;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '画像ファイルのみアップロード可能です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const timestamp = Date.now();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const processedUrls: { thumbnail: string; featured: string } = {
      thumbnail: '',
      featured: '',
    };

    for (const [sizeName, dimensions] of Object.entries(IMAGE_SIZES)) {
      const size = sizeName as keyof typeof IMAGE_SIZES;

      const processedBuffer = await sharp(buffer)
        .resize(dimensions.width, dimensions.height, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      const filePath = `blog/${timestamp}_${size}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('project-media')
        .upload(filePath, processedBuffer, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (uploadError) {
        console.error(`Upload error for ${size}:`, uploadError);
        throw new Error(`${size}サイズのアップロードに失敗しました`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('project-media')
        .getPublicUrl(filePath);

      processedUrls[size] = publicUrlData.publicUrl;
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
