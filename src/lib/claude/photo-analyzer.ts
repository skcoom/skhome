import Anthropic from '@anthropic-ai/sdk';
import type { ProjectTag } from '@/types/database';
import type { PhotoAnalysisResult } from '@/types/info-integration';

interface ImageData {
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  phase: 'before' | 'during' | 'after';
}

const ANALYSIS_PROMPT = `あなたは建設・リフォーム会社の施工写真を分析するアシスタントです。
以下の施工写真から、工事に関する情報を推測してください。

## 分析観点

1. **施工内容の詳細**: 何をした工事か具体的に推測してください
   - 例：キッチンのシステムキッチン入替え、浴室のユニットバス交換、トイレの便器交換など

2. **建物の特徴**: 写真から推測できる建物の情報
   - 建物種類：戸建て/マンション/アパート/店舗/事務所
   - 築年数の推測（築浅/築10-20年程度/築20年以上など）
   - 建物の特徴（和風/洋風、一般的な住宅/高級住宅など）

3. **施工規模**: 工事の規模を推測
   - small（小規模）：1箇所のみの部分工事
   - medium（中規模）：2-3箇所の工事
   - large（大規模）：全面リフォーム、4箇所以上の工事

4. **使用材料**: 写真から推測される材料や設備
   - 例：LIXIL製システムキッチン、TOTO製ユニットバス、フローリング材など

## 推測するタグ
以下から該当するものを全て選択してください：
- 全面リフォーム：3箇所以上の大規模リフォーム
- キッチン：システムキッチン、流し台、レンジフード等
- 浴室・洗面：ユニットバス、浴槽、洗面台等
- トイレ：便器、ウォシュレット等
- リビング・居室：フローリング、クロス、建具等
- 玄関・廊下：玄関ドア、土間、廊下等
- 外壁・屋根：外壁塗装、サイディング、屋根工事等
- 看板：看板設置、サイン工事等
- 住宅：一般住宅での工事
- 店舗：店舗・事務所・商業施設での工事

## 出力形式（JSON）
必ず以下の形式で出力してください。他のテキストは含めないでください。
{
  "constructionDetails": "施工内容の詳細説明（50-100文字）",
  "buildingCharacteristics": "建物の特徴（30-50文字）",
  "estimatedScale": "small|medium|large",
  "estimatedMaterials": ["材料1", "材料2"],
  "suggestedTags": ["タグ1", "タグ2"],
  "confidence": 0.0-1.0
}

写真から判断できない情報はnullとしてください。`;

function getMediaType(url: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  if (url.includes('.webp')) return 'image/webp';
  if (url.includes('.png')) return 'image/png';
  if (url.includes('.gif')) return 'image/gif';
  return 'image/jpeg';
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

/**
 * 施工写真を分析し、工事情報を推測する
 * @param client Anthropic APIクライアント
 * @param images 分析対象の画像データ配列
 * @returns 分析結果
 */
export async function analyzePhotosForProjectInfo(
  client: Anthropic,
  images: ImageData[]
): Promise<PhotoAnalysisResult> {
  if (images.length === 0) {
    return {
      constructionDetails: null,
      buildingCharacteristics: null,
      estimatedScale: null,
      estimatedMaterials: null,
      suggestedTags: [],
      confidence: 0,
    };
  }

  const imageContents = images.map(({ base64, mediaType }) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: mediaType,
      data: base64,
    },
  }));

  const phaseInfo = images
    .map((img, i) => `画像${i + 1}: ${img.phase === 'before' ? '施工前' : img.phase === 'during' ? '施工中' : '施工後'}`)
    .join('、');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `${ANALYSIS_PROMPT}\n\n## 写真情報\n${phaseInfo}` },
          ...imageContents,
        ],
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('AIからの応答がありませんでした');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('分析結果の解析に失敗しました');
  }

  const result = JSON.parse(jsonMatch[0]);

  // タグの検証
  const validTags: ProjectTag[] = [
    '全面リフォーム', 'キッチン', '浴室・洗面', 'トイレ',
    'リビング・居室', '玄関・廊下', '外壁・屋根', '看板',
    '住宅', '店舗',
  ];
  const suggestedTags = (result.suggestedTags || []).filter(
    (tag: string): tag is ProjectTag => validTags.includes(tag as ProjectTag)
  );

  return {
    constructionDetails: result.constructionDetails || null,
    buildingCharacteristics: result.buildingCharacteristics || null,
    estimatedScale: ['small', 'medium', 'large'].includes(result.estimatedScale)
      ? result.estimatedScale
      : null,
    estimatedMaterials: Array.isArray(result.estimatedMaterials)
      ? result.estimatedMaterials
      : null,
    suggestedTags,
    confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
  };
}

/**
 * プロジェクトの写真URLから分析用データを準備する
 * 施工前・施工後を優先して最大5枚を選択
 * @param photos プロジェクトの写真データ
 * @returns 分析用画像データ
 */
export async function preparePhotosForAnalysis(
  photos: { file_url: string; thumbnail_url?: string; phase: 'before' | 'during' | 'after' }[]
): Promise<ImageData[]> {
  if (photos.length === 0) {
    return [];
  }

  // 施工前・施工後を優先して選択（最大5枚）
  const beforePhotos = photos.filter(p => p.phase === 'before');
  const afterPhotos = photos.filter(p => p.phase === 'after');
  const duringPhotos = photos.filter(p => p.phase === 'during');

  const selected: typeof photos = [];

  // 施工後から2枚
  selected.push(...afterPhotos.slice(0, 2));
  // 施工前から2枚
  selected.push(...beforePhotos.slice(0, 2));
  // 残り枠で施工中から
  const remaining = 5 - selected.length;
  if (remaining > 0) {
    selected.push(...duringPhotos.slice(0, remaining));
  }

  // さらに残り枠があれば追加
  const stillRemaining = 5 - selected.length;
  if (stillRemaining > 0) {
    const allPhotos = [...afterPhotos, ...beforePhotos, ...duringPhotos];
    const notSelected = allPhotos.filter(p => !selected.includes(p));
    selected.push(...notSelected.slice(0, stillRemaining));
  }

  // 画像データを取得
  const imagePromises = selected.map(async (photo) => {
    const url = photo.thumbnail_url || photo.file_url;
    try {
      const base64 = await fetchImageAsBase64(url);
      return {
        base64,
        mediaType: getMediaType(url),
        phase: photo.phase,
      };
    } catch (error) {
      console.error(`Failed to fetch image: ${url}`, error);
      return null;
    }
  });

  const results = await Promise.all(imagePromises);
  return results.filter((r): r is ImageData => r !== null);
}
