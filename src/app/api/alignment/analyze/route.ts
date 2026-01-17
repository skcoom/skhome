import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requirePermission } from '@/lib/auth';

const client = new Anthropic();

interface AlignmentResult {
  before: { offsetX: number; offsetY: number; scale: number };
  after: { offsetX: number; offsetY: number; scale: number };
  explanation: string;
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mediaType: string }> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const mediaType = contentType.split(';')[0].trim();

  return { base64, mediaType };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, error: authError } = await requirePermission('media:write');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const body = await request.json();
    const { beforeImageUrl, afterImageUrl } = body;

    if (!beforeImageUrl || !afterImageUrl) {
      return NextResponse.json(
        { error: '画像URLが必要です' },
        { status: 400 }
      );
    }

    const [beforeImage, afterImage] = await Promise.all([
      fetchImageAsBase64(beforeImageUrl),
      fetchImageAsBase64(afterImageUrl),
    ]);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: beforeImage.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: beforeImage.base64,
              },
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: afterImage.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: afterImage.base64,
              },
            },
            {
              type: 'text',
              text: `これは施工前（1枚目）と施工後（2枚目）の写真です。
2つの画像の構図を揃えるために、施工後の画像をどのように調整すべきか分析してください。

以下の形式でJSONのみを返してください：
{
  "before": { "offsetX": 0, "offsetY": 0, "scale": 1 },
  "after": { "offsetX": <横方向のピクセル移動量 -200〜200>, "offsetY": <縦方向のピクセル移動量 -200〜200>, "scale": <拡大縮小率 0.5〜2.0> },
  "explanation": "<調整理由の簡潔な説明>"
}

注意点：
- beforeは常に固定（offsetX: 0, offsetY: 0, scale: 1）
- afterのみ調整
- 同じ被写体や特徴的な部分が重なるように調整
- スケールは画角の違いを補正するために使用
- 完全に一致させる必要はなく、おおよその位置合わせでOK`,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from response');
    }

    const result: AlignmentResult = JSON.parse(jsonMatch[0]);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Alignment analysis error:', error);
    return NextResponse.json(
      { error: '画像分析に失敗しました' },
      { status: 500 }
    );
  }
}
