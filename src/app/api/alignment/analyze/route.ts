import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requirePermission } from '@/lib/auth';
import { fetchApprovedImage } from '@/lib/safe-media-fetch';

const client = new Anthropic();

interface AlignmentResult {
  before: { offsetX: number; offsetY: number; scale: number };
  after: { offsetX: number; offsetY: number; scale: number };
  explanation: string;
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
      fetchApprovedImage(beforeImageUrl),
      fetchApprovedImage(afterImageUrl),
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
              text: `これはリフォーム工事の施工前（1枚目）と施工後（2枚目）の写真です。
この2枚をビフォーアフター比較スライダーで表示します。スライダーを左右に動かすと、同じ位置で施工前後が切り替わって見えるようにしたいです。

【目的】
2枚の画像を重ねたとき、壁・床・天井・窓・ドアなど動かない構造物が同じ位置に来るように、施工後画像の位置とスケールを調整してください。

【分析手順】
1. 両画像で共通する固定物（壁の角、窓枠、ドア枠、柱など）を特定
2. 施工前画像でその固定物がある位置を基準とする
3. 施工後画像で同じ固定物が基準位置に来るよう、移動量とスケールを計算

【出力形式】JSONのみを返してください：
{
  "before": { "offsetX": 0, "offsetY": 0, "scale": 1 },
  "after": { "offsetX": <横移動px -200〜200、右に動かすなら正>, "offsetY": <縦移動px -200〜200、下に動かすなら正>, "scale": <拡大縮小 0.5〜4.0> },
  "explanation": "<何を基準に調整したか>"
}

【重要】
- beforeは固定、afterのみ調整
- 家具や装飾品ではなく、壁・床・窓など動かない構造物を基準にする
- 撮影距離が違う場合はscaleで補正（遠くから撮った方を拡大）`,
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
