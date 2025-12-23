import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClaudeClient } from '@/lib/claude/client';
import { requirePermission } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import type { ProjectMedia } from '@/types/database';

interface SuggestedPair {
  beforeImage: ProjectMedia;
  afterImage: ProjectMedia;
  score: number;
  reason: string;
}

// 画像URLからBase64を取得
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return base64;
}

// メディアタイプを判定
function getMediaType(url: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  if (url.includes('.webp')) return 'image/webp';
  if (url.includes('.png')) return 'image/png';
  if (url.includes('.gif')) return 'image/gif';
  return 'image/jpeg';
}

// ピックアップ画像提案（AI機能: スタッフ以上、Rate Limit適用）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      `ai:suggestPickup:${user.id}`,
      RATE_LIMITS.ai
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'AI機能の利用回数が上限に達しました。しばらく経ってからお試しください。' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          },
        }
      );
    }

    const { id: projectId } = await params;
    const supabase = await createClient();

    // プロジェクトのメディアを取得
    const { data: mediaData, error: mediaError } = await supabase
      .from('project_media')
      .select('*')
      .eq('project_id', projectId)
      .eq('type', 'image')
      .order('created_at', { ascending: true });

    if (mediaError) {
      return NextResponse.json(
        { error: 'メディアの取得に失敗しました' },
        { status: 500 }
      );
    }

    const media = mediaData as ProjectMedia[];

    // before/after画像を分類
    const beforeImages = media.filter((m) => m.phase === 'before');
    const afterImages = media.filter((m) => m.phase === 'after');

    if (beforeImages.length === 0 || afterImages.length === 0) {
      return NextResponse.json({
        suggestions: [],
        message: '施工前・施工後の両方の画像が必要です',
      });
    }

    // Claude Vision APIでペアを評価
    const claude = createClaudeClient();
    const suggestions: SuggestedPair[] = [];

    // 全ての組み合わせを評価（最大9ペアまで）
    const maxPairs = 9;
    let pairCount = 0;

    for (const beforeImg of beforeImages) {
      if (pairCount >= maxPairs) break;

      for (const afterImg of afterImages) {
        if (pairCount >= maxPairs) break;

        try {
          // 画像をBase64で取得（サムネイルを使用してコスト削減）
          const beforeUrl = beforeImg.thumbnail_url || beforeImg.file_url;
          const afterUrl = afterImg.thumbnail_url || afterImg.file_url;

          const [beforeBase64, afterBase64] = await Promise.all([
            fetchImageAsBase64(beforeUrl),
            fetchImageAsBase64(afterUrl),
          ]);

          // Claude Vision APIで評価
          const response = await claude.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `以下の2枚の画像は、建設・リフォーム工事の「施工前（Before）」と「施工後（After）」の写真です。
この2枚がビフォーアフターのペアとして適切かどうかを評価してください。

## 評価基準
1. 構図の類似性: 同じ場所・角度から撮影されているか
2. 変化の明確さ: 施工による変化が分かりやすいか
3. 画質: ブレやピンボケがないか、明るさが適切か
4. HP掲載適性: ホームページの施工実績として魅力的か

## 出力形式（JSON）
{
  "score": 1-10の整数,
  "reason": "50文字以内の評価理由"
}

スコアが7以上であれば、HP掲載におすすめのペアとします。`,
                  },
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: getMediaType(beforeUrl),
                      data: beforeBase64,
                    },
                  },
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: getMediaType(afterUrl),
                      data: afterBase64,
                    },
                  },
                ],
              },
            ],
          });

          // レスポンスをパース
          const textContent = response.content.find((block) => block.type === 'text');
          if (textContent && textContent.type === 'text') {
            // JSONを抽出
            const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const result = JSON.parse(jsonMatch[0]);
                suggestions.push({
                  beforeImage: beforeImg,
                  afterImage: afterImg,
                  score: result.score || 0,
                  reason: result.reason || '',
                });
              } catch {
                console.error('Failed to parse evaluation result');
              }
            }
          }

          pairCount++;
        } catch (err) {
          console.error('Error evaluating pair:', err);
        }
      }
    }

    // スコア順にソート
    suggestions.sort((a, b) => b.score - a.score);

    // スコア7以上のものをおすすめとして返す
    const recommended = suggestions.filter((s) => s.score >= 7);

    return NextResponse.json({
      suggestions: recommended,
      allEvaluations: suggestions,
      message: recommended.length > 0
        ? `${recommended.length}件のおすすめペアが見つかりました`
        : 'おすすめのペアが見つかりませんでした',
    });
  } catch (error) {
    console.error('Suggest pickup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '提案の生成に失敗しました' },
      { status: 500 }
    );
  }
}
