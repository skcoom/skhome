import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClaudeClient } from '@/lib/claude/client';
import { requirePermission } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import Anthropic from '@anthropic-ai/sdk';

type Params = Promise<{ id: string; docId: string }>;

const DOCUMENT_ANALYSIS_PROMPT = `あなたは建設会社の図面・見積書・仕様書から工事情報を抽出し、現場の詳細情報を言語化するアシスタントです。

以下のドキュメントを解析し、現場管理に役立つ情報を抽出してください。

## 抽出・言語化する内容

1. **工事概要**: 工事の内容を分かりやすく説明（どんな工事か、規模感など）
2. **施工箇所**: 具体的な施工場所や対象箇所
3. **使用材料・設備**: 主要な材料名、設備機器の型番やメーカー
4. **工事の特徴**: 特殊な工法、注意点、こだわりポイント
5. **数量・金額情報**: 主要な数量や金額（見積書の場合）

## 出力形式

読みやすい文章で現場情報をまとめてください。
箇条書きと説明文を組み合わせて、現場担当者が一目で理解できる形式にしてください。
200〜400文字程度を目安にしてください。

## 注意事項
- ドキュメントに記載されていない情報は推測しないでください
- 専門用語は分かりやすく補足してください
- 金額情報がある場合は概算として記載してください`;

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

    const summary = textContent.text;

    // ドキュメントにAI要約を保存
    const { error: updateError } = await supabase
      .from('project_documents')
      .update({ ai_summary: summary })
      .eq('id', docId);

    if (updateError) {
      console.error('Document summary update error:', updateError);
    }

    return NextResponse.json({
      success: true,
      summary,
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
