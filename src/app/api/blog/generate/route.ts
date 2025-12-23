import { NextRequest, NextResponse } from 'next/server';
import { generateBlogPost } from '@/lib/claude/client';
import { requirePermission } from '@/lib/auth';

// ブログ記事生成（AI機能: スタッフ以上）
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

    const body = await request.json();
    const { name, category, description, clientName, address } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: '工事名とカテゴリは必須です' },
        { status: 400 }
      );
    }

    // Claude APIでブログ記事を生成
    const generatedPost = await generateBlogPost({
      name,
      category,
      description,
      clientName,
      address,
    });

    return NextResponse.json(generatedPost);
  } catch (error) {
    console.error('Blog generation error:', error);

    if (error instanceof Error && error.message === 'ANTHROPIC_API_KEY is not set') {
      return NextResponse.json(
        { error: 'APIキーが設定されていません。環境変数ANTHROPIC_API_KEYを設定してください。' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'ブログ記事の生成に失敗しました' },
      { status: 500 }
    );
  }
}
