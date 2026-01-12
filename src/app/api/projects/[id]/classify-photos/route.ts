import { NextRequest, NextResponse } from 'next/server';
import { createClaudeClient } from '@/lib/claude/client';
import { requirePermission } from '@/lib/auth';
import type { MediaPhase, PhotoClassificationResult, PendingClassificationFile } from '@/types/database';

interface ClassifyPhotosRequest {
  files: PendingClassificationFile[];
}

interface AIClassificationResult {
  imageIndex: number;
  phase: MediaPhase;
  confidence: number;
  hpSuitability: number;
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

// バッチで画像を分析
async function analyzeImageBatch(
  files: PendingClassificationFile[],
  claude: ReturnType<typeof createClaudeClient>
): Promise<PhotoClassificationResult[]> {
  // 画像ファイルのみフィルタ
  const imageFiles = files.filter(f => f.type === 'image');

  if (imageFiles.length === 0) {
    return [];
  }

  // 画像をBase64で取得（サムネイルを優先）
  const imagePromises = imageFiles.map(async (file) => {
    const url = file.thumbnail_url || file.file_url;
    try {
      const base64 = await fetchImageAsBase64(url);
      return { file, base64, url };
    } catch (error) {
      console.error(`Failed to fetch image: ${url}`, error);
      return null;
    }
  });

  const imageResults = (await Promise.all(imagePromises)).filter(
    (r): r is { file: PendingClassificationFile; base64: string; url: string } => r !== null
  );

  if (imageResults.length === 0) {
    return [];
  }

  // Claude Vision APIで分析
  const imageContents = imageResults.map(({ base64, url }) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: getMediaType(url),
      data: base64,
    },
  }));

  const prompt = `以下の${imageResults.length}枚の建設・リフォーム現場の写真を分析してください。

## 分類基準
- before（施工前）: 古い設備、傷んだ箇所、汚れ、劣化した状態、工事前の現状
- during（施工中）: 作業者、工具、養生シート、解体途中、配管・配線の露出、工事途中の状態
- after（施工後）: 新しい設備、きれいな仕上がり、完成した状態、清潔な仕上がり

## HP掲載適性評価（1-10点）
以下の観点で総合評価してください：
- 構図の良さ（対象物が中央にあるか、傾いていないか）
- 明るさ・画質（暗すぎない、ブレていない、ピントが合っている）
- 散らかりや不要物の有無（ゴミ、私物、関係ない物が写っていない）
- 施工効果の分かりやすさ（何が変わったか、どこを工事したかが分かる）

7点以上：HP掲載に適している
4-6点：条件付きで掲載可能
3点以下：掲載には不向き

## 出力形式
必ず以下のJSON配列形式で出力してください。他のテキストは含めないでください。
[
  {
    "imageIndex": 0,
    "phase": "before",
    "confidence": 0.95,
    "hpSuitability": 8,
    "reason": "古いキッチンの状態が明確"
  },
  ...
]

imageIndexは0から始まる画像の順番です。全ての画像について結果を出力してください。`;

  try {
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...imageContents,
          ],
        },
      ],
    });

    // レスポンスをパース
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // JSONを抽出
    const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const aiResults: AIClassificationResult[] = JSON.parse(jsonMatch[0]);

    // 結果をマッピング
    return aiResults.map((result) => {
      const file = imageResults[result.imageIndex]?.file;
      if (!file) {
        throw new Error(`Invalid imageIndex: ${result.imageIndex}`);
      }

      return {
        tempId: file.tempId,
        suggestedPhase: result.phase,
        confidence: result.confidence,
        hpSuitability: result.hpSuitability,
        reason: result.reason,
      };
    });
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

// 写真の自動分類API（スタッフ以上）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // 権限チェック
    const { error: authError } = await requirePermission('ai:use');
    if (authError) {
      return NextResponse.json(
        { error: authError },
        { status: authError.includes('権限') ? 403 : 401 }
      );
    }

    const { id: projectId } = await params;
    const body: ClassifyPhotosRequest = await request.json();

    if (!body.files || body.files.length === 0) {
      return NextResponse.json(
        { error: '分類する画像がありません' },
        { status: 400 }
      );
    }

    // 画像のみをフィルタ
    const imageFiles = body.files.filter(f => f.type === 'image');
    const videoFiles = body.files.filter(f => f.type === 'video');

    if (imageFiles.length === 0) {
      return NextResponse.json({
        results: [],
        skippedVideos: videoFiles.length,
        message: '画像ファイルがありません。動画は分類対象外です。',
      });
    }

    const claude = createClaudeClient();
    const results: PhotoClassificationResult[] = [];
    const BATCH_SIZE = 20;

    // バッチ処理
    for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
      const batch = imageFiles.slice(i, i + BATCH_SIZE);

      // リトライロジック
      let retries = 0;
      const MAX_RETRIES = 3;

      while (retries < MAX_RETRIES) {
        try {
          const batchResults = await analyzeImageBatch(batch, claude);
          results.push(...batchResults);
          break;
        } catch (_error) {
          retries++;
          if (retries >= MAX_RETRIES) {
            console.error(`Batch ${i / BATCH_SIZE} failed after ${MAX_RETRIES} retries`, _error);
            // 失敗したバッチはデフォルト値で埋める
            batch.forEach((file) => {
              results.push({
                tempId: file.tempId,
                suggestedPhase: 'before',
                confidence: 0,
                hpSuitability: 5,
                reason: '分析に失敗しました',
              });
            });
          } else {
            // 少し待ってリトライ
            await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
          }
        }
      }
    }

    return NextResponse.json({
      results,
      skippedVideos: videoFiles.length,
      projectId,
      message: `${results.length}枚の画像を分析しました${videoFiles.length > 0 ? `（動画${videoFiles.length}件はスキップ）` : ''}`,
    });
  } catch (error) {
    console.error('Classify photos error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '分類に失敗しました' },
      { status: 500 }
    );
  }
}
