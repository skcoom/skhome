import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClaudeClient } from '@/lib/claude/client';
import { requirePermission } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import Anthropic from '@anthropic-ai/sdk';

type Params = Promise<{ id: string; docId: string }>;

const DOCUMENT_ANALYSIS_PROMPT = `あなたは建設会社の図面・見積書・仕様書から工事情報を抽出するアシスタントです。

以下のドキュメントを解析し、2種類の要約を作成してください。

---

## 1. 管理用メモ（社内向け詳細情報）

現場管理に役立つ詳細情報を抽出してください：
- 工事概要：工事の内容、規模感
- 施工箇所：具体的な場所や対象
- 使用材料・設備：材料名、型番、メーカー
- 金額情報：見積金額、内訳（ある場合）
- 工事の特徴：特殊な工法、注意点

形式：プレーンテキストで、ハイフン（-）を使った箇条書き。Markdownの見出し（#）や強調（**）は使用しない。300〜500文字。

---

## 2. 公開用概要（お客様向けホームページ掲載文）

ホームページの施工実績ページに掲載する、お客様向けの文章を作成してください：
- 工事の魅力や価値を伝える
- お客様のお悩みとその解決を示す
- 完成後のイメージや暮らしの変化を描写

**絶対に含めないでください**：
- 具体的な金額や価格（〇〇万円など）
- 材料の型番や品番
- 専門的なコード・記号
- 施主様の個人名

形式：読みやすい自然な文章。100〜150文字程度の短い概要。

---

## 出力形式（JSON）

必ず以下のJSON形式で出力してください。JSONのみを出力し、他の説明は不要です。

{
  "managementSummary": "（管理用メモの内容）",
  "publicSummary": "（公開用概要の内容）"
}`;

// 保存済みドキュメントをAI解析
export async function POST(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id, docId } = await params;

    // 権限チェック
    const { user, error: authError } = await requirePermission('ai:use');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    // Rate Limitチェック
    const rateLimitResult = await checkRateLimit(
      `documentAnalysis:${user.id}`,
      RATE_LIMITS.documentAnalysis
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'ドキュメント解析の利用回数が上限に達しました。しばらく経ってからお試しください。' },
        { status: 429 }
      );
    }

    const supabase = await createClient();

    // ドキュメント情報を取得
    const { data: docData, error: fetchError } = await supabase
      .from('project_documents')
      .select('*')
      .eq('id', docId)
      .eq('project_id', id)
      .single();

    if (fetchError || !docData) {
      return NextResponse.json({ error: 'ドキュメントが見つかりません' }, { status: 404 });
    }

    // PDFをダウンロード
    const pdfResponse = await fetch(docData.file_url);
    if (!pdfResponse.ok) {
      return NextResponse.json({ error: 'PDFのダウンロードに失敗しました' }, { status: 500 });
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    // Claude APIで解析
    const claude = createClaudeClient();
    const messageContent: Anthropic.MessageCreateParams['messages'][0]['content'] = [
      {
        type: 'text',
        text: DOCUMENT_ANALYSIS_PROMPT,
      },
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: pdfBase64,
        },
      },
    ];

    const response = await claude.messages.create({
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
      return NextResponse.json({ error: 'AIからの応答がありませんでした' }, { status: 500 });
    }

    // JSONをパース
    let managementSummary: string;
    let publicSummary: string;
    try {
      // AIの応答からJSONを抽出（マークダウンコードブロックに囲まれている場合も対応）
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON形式の応答が見つかりません');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      managementSummary = parsed.managementSummary || '';
      publicSummary = parsed.publicSummary || '';
    } catch {
      // JSONパースに失敗した場合、従来の形式として処理
      managementSummary = textContent.text;
      publicSummary = '';
    }

    // ドキュメントにAI要約を保存（管理用メモを保存）
    const { error: updateError } = await supabase
      .from('project_documents')
      .update({ ai_summary: managementSummary })
      .eq('id', docId);

    if (updateError) {
      console.error('Document summary update error:', updateError);
    }

    return NextResponse.json({
      success: true,
      summary: managementSummary,
      publicSummary,
      documentId: docId,
    });
  } catch (error) {
    console.error('Document analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '解析に失敗しました' },
      { status: 500 }
    );
  }
}
