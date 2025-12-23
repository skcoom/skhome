import { NextRequest, NextResponse } from 'next/server';
import { generateBlogPost } from '@/lib/claude/client';
import { requirePermission } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

// ブログ記事生成（AI機能: スタッフ以上、Rate Limit適用）
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

    // Rate Limitチェック（ユーザーIDベース）
    const rateLimitResult = await checkRateLimit(
      `ai:blogGenerate:${user.id}`,
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
