import { NextRequest, NextResponse } from 'next/server';
import { createClaudeClient } from '@/lib/claude/client';
import { analyzeWithClaude } from '@/lib/claude/document-analyzer';
import type { AnalyzeDocumentRequest } from '@/types/document-analysis';

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return data.text;
}

export async function POST(request: NextRequest) {
  try {
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

    switch (fileType) {
      case 'pdf': {
        const pdfBuffer = Buffer.from(content, 'base64');
        textContent = await extractTextFromPdf(pdfBuffer);
        break;
      }

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
