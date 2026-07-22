import { NextRequest, NextResponse } from 'next/server';
import { createClaudeClient } from '@/lib/claude/client';
import { analyzeWithClaude } from '@/lib/claude/document-analyzer';
import { requirePermission } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import type { AnalyzeDocumentRequest } from '@/types/document-analysis';

const MAX_TEXT_CHARACTERS = 100_000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

function decodeBase64(content: string, maxBytes: number): Buffer | null {
  if (
    content.length === 0
    || content.length > Math.ceil(maxBytes / 3) * 4 + 4
    || content.length % 4 !== 0
    || !/^[A-Za-z0-9+/]*={0,2}$/.test(content)
  ) {
    return null;
  }

  const bytes = Buffer.from(content, 'base64');
  return bytes.byteLength > 0 && bytes.byteLength <= maxBytes ? bytes : null;
}

function detectSupportedImage(bytes: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | null {
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isGif = bytes.subarray(0, 6).toString('ascii') === 'GIF87a'
    || bytes.subarray(0, 6).toString('ascii') === 'GIF89a';
  const isWebp = bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  if (isJpeg) return 'image/jpeg';
  if (isPng) return 'image/png';
  if (isGif) return 'image/gif';
  if (isWebp) return 'image/webp';
  return null;
}

// ドキュメント解析（AI機能: スタッフ以上、Rate Limit適用）
export async function POST(request: NextRequest) {
  try {
    // 権限チェック
    const { user, error: authError } = await requirePermission('ai:use');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    // Rate Limitチェック（ユーザーIDベース）
    const rateLimitResult = await checkRateLimit(
      `documentAnalysis:${user.id}`,
      RATE_LIMITS.documentAnalysis
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'ドキュメント解析の利用回数が上限に達しました。しばらく経ってからお試しください。' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          },
        }
      );
    }

    const body: AnalyzeDocumentRequest = await request.json();
    const { fileType, content, fileName } = body;

    if (!fileType || typeof content !== 'string' || !content || typeof fileName !== 'string' || !fileName || fileName.length > 255) {
      return NextResponse.json(
        { error: 'ファイル情報が不足しています' },
        { status: 400 }
      );
    }

    let textContent = '';
    let imageBase64: string | null = null;
    let imageMediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | null = null;
    let pdfBase64: string | null = null;

    switch (fileType) {
      case 'pdf':
        // PDFはClaude Vision APIで直接解析
        {
          const bytes = decodeBase64(content, MAX_PDF_BYTES);
          if (!bytes || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
            return NextResponse.json({ error: '20MB以下のPDFを選んでください' }, { status: 400 });
          }
        }
        pdfBase64 = content;
        break;

      case 'text':
        if (content.length > MAX_TEXT_CHARACTERS) {
          return NextResponse.json({ error: '文章は10万文字以内にしてください' }, { status: 400 });
        }
        textContent = content;
        break;

      case 'image':
        {
          const bytes = decodeBase64(content, MAX_IMAGE_BYTES);
          imageMediaType = bytes ? detectSupportedImage(bytes) : null;
          if (!bytes || !imageMediaType) {
            return NextResponse.json({ error: '10MB以下のJPEG、PNG、WebP、GIF画像を選んでください' }, { status: 400 });
          }
        }
        imageBase64 = content;
        break;

      default:
        return NextResponse.json(
          { error: 'サポートされていないファイル形式です' },
          { status: 400 }
        );
    }

    const claude = createClaudeClient();
    const result = await analyzeWithClaude(claude, {
      text: textContent,
      imageBase64,
      imageMediaType,
      pdfBase64,
      fileName,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Document analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '解析に失敗しました' },
      { status: 500 }
    );
  }
}
