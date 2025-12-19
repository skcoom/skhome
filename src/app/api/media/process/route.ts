import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';

// 画像サイズ設定
const IMAGE_SIZES = {
  thumbnail: { width: 300, height: 300 },
  medium: { width: 800, height: 800 },
  large: { width: 1600, height: 1600 },
} as const;

// WebP品質設定
const WEBP_QUALITY = 80;

interface ProcessedImages {
  thumbnail: { url: string; path: string };
  medium: { url: string; path: string };
  large: { url: string; path: string };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;

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

    // 画像ファイルかどうかチェック
    if (!file.type.startsWith('image/')) {
      // 動画の場合はそのまま返す（処理しない）
      return NextResponse.json({
        isVideo: true,
        message: '動画ファイルは処理をスキップします',
      });
    }

    const supabase = await createClient();
    const timestamp = Date.now();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 各サイズで画像を処理
    const processedImages: ProcessedImages = {
      thumbnail: { url: '', path: '' },
      medium: { url: '', path: '' },
      large: { url: '', path: '' },
    };

    for (const [sizeName, dimensions] of Object.entries(IMAGE_SIZES)) {
      const size = sizeName as keyof typeof IMAGE_SIZES;

      // Sharpで画像をリサイズ＆WebP変換
      const processedBuffer = await sharp(buffer)
        .resize(dimensions.width, dimensions.height, {
          fit: 'inside', // アスペクト比を維持
          withoutEnlargement: true, // 元画像より大きくしない
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      // ファイルパスを生成
      const filePath = `${projectId}/${timestamp}_${size}.webp`;

      // Supabase Storageにアップロード
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

      // 公開URLを取得
      const { data: publicUrlData } = supabase.storage
        .from('project-media')
        .getPublicUrl(filePath);

      processedImages[size] = {
        url: publicUrlData.publicUrl,
        path: filePath,
      };
    }

    return NextResponse.json({
      success: true,
      images: processedImages,
      // DB保存用のURL（既存フィールドに合わせる）
      file_url: processedImages.medium.url,
      thumbnail_url: processedImages.thumbnail.url,
      large_url: processedImages.large.url,
    });
  } catch (error) {
    console.error('Image processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '画像処理に失敗しました' },
      { status: 500 }
    );
  }
}
