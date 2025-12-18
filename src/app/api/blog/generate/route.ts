import { NextRequest, NextResponse } from 'next/server';
import { generateBlogPost } from '@/lib/claude/client';

export async function POST(request: NextRequest) {
  try {
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
