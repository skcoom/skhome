import { NextRequest, NextResponse } from 'next/server';
import { createClaudeClient } from '@/lib/claude/client';
import { analyzeWithClaude } from '@/lib/claude/document-analyzer';
import { requirePermission } from '@/lib/auth';
import type { AnalyzeDocumentRequest } from '@/types/document-analysis';

// ドキュメント解析（AI機能: スタッフ以上）
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

    const body: AnalyzeDocumentRequest = await request.json();
    const { fileType, content, fileName } = body;

    if (!fileType || !content || !fileName) {
      return NextResponse.json(
        { error: 'ファイル情報が不足しています' },
        { status: 400 }
      );
    }

    let textContent = '';
    let imageBase64: string | null = null;
    let pdfBase64: string | null = null;

    switch (fileType) {
      case 'pdf':
        // PDFはClaude Vision APIで直接解析
        pdfBase64 = content;
        break;

      case 'text':
        textContent = content;
        break;

      case 'image':
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
