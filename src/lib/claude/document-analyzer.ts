import Anthropic from '@anthropic-ai/sdk';
import type { ExtractedProjectData } from '@/types/document-analysis';

interface AnalyzeInput {
  text: string;
  imageBase64: string | null;
  pdfBase64?: string | null;
  fileName: string;
}

const EXTRACTION_PROMPT = `あなたは建設会社の見積書・請求書から工事情報を抽出するアシスタントです。
以下のドキュメントから、工事に関する情報を抽出してください。

## 抽出対象フィールド
1. name（工事名）: 工事の正式名称やプロジェクト名
2. client_name（施主名）: 発注者・クライアント・お客様の名前
3. address（施工場所）: 工事を行う住所や場所
4. tags（タグ）: 工事内容に該当するタグを配列で選択（複数可）
   選択肢:
   - 全面リフォーム: 3箇所以上の大規模リフォーム、または間取り変更を含む場合
   - キッチン: システムキッチン、流し台、レンジフード、コンロ等の工事
   - 浴室・洗面: ユニットバス、浴槽、シャワー、洗面台等の工事
   - トイレ: 便器、ウォシュレット、手洗い器等の工事
   - リビング・居室: フローリング、クロス、建具、天井等の内装工事
   - 玄関・廊下: 玄関ドア、土間、下駄箱、廊下等の工事
   - 外壁・屋根: 外壁塗装、サイディング、屋根工事、ベランダ等
   - 住宅: 一般住宅での工事（デフォルト）
   - 店舗: 店舗・事務所・商業施設での工事
5. status（ステータス）: 以下のいずれかに分類
   - planning: 計画中・準備中
   - in_progress: 施工中・工事中
   - completed: 完了・竣工
6. start_date（開始日）: 工事開始日・着工日（YYYY-MM-DD形式）
7. end_date（完了日）: 工事完了日・竣工日（YYYY-MM-DD形式）
8. description（工事概要）: 工事内容の要約（100文字以内）

## タグ判定ルール
- 見積明細の項目名から工事内容を判断してタグを付与
- 工事場所が不明な場合はデフォルトで「住宅」を付与
- 3箇所以上の工事がある場合は「全面リフォーム」を検討
- 複数の場所にまたがる場合は該当する全てのタグを付与

## 出力形式（JSON）
{
  "name": "抽出した値またはnull",
  "client_name": "抽出した値またはnull",
  "address": "抽出した値またはnull",
  "tags": ["該当するタグの配列"],
  "status": "planning|in_progress|completed またはnull",
  "start_date": "YYYY-MM-DD またはnull",
  "end_date": "YYYY-MM-DD またはnull",
  "description": "抽出した値またはnull",
  "confidence": {
    "name": 0.0-1.0,
    "client_name": 0.0-1.0,
    "address": 0.0-1.0,
    "tags": 0.0-1.0,
    "status": 0.0-1.0,
    "start_date": 0.0-1.0,
    "end_date": 0.0-1.0,
    "description": 0.0-1.0
  }
}

## 注意事項
- 明確に記載されていない情報はnullとしてください（tagsは空配列[]）
- 推測は避け、記載内容に基づいて抽出してください
- 日付は必ずYYYY-MM-DD形式に変換してください（例: 2024年1月15日 → 2024-01-15）
- tagsは必ず配列形式で、指定された選択肢のみ使用してください
- confidenceは抽出の確信度を0.0〜1.0で表現してください`;

function detectImageMediaType(
  fileName: string
): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

export async function analyzeWithClaude(
  client: Anthropic,
  input: AnalyzeInput
): Promise<ExtractedProjectData> {
  const messageContent: Anthropic.MessageCreateParams['messages'][0]['content'] =
    [];

  messageContent.push({
    type: 'text',
    text: EXTRACTION_PROMPT,
  });

  if (input.text) {
    messageContent.push({
      type: 'text',
      text: `\n## ドキュメント内容\n${input.text}`,
    });
  }

  if (input.imageBase64) {
    const mediaType = detectImageMediaType(input.fileName);

    messageContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: input.imageBase64,
      },
    });
  }

  if (input.pdfBase64) {
    messageContent.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: input.pdfBase64,
      },
    });
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: messageContent,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('AIからの応答がありませんでした');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('抽出結果の解析に失敗しました');
  }

  return JSON.parse(jsonMatch[0]) as ExtractedProjectData;
}
