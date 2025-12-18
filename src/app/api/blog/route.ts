import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ブログ記事一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const limit = searchParams.get('limit');

    let query = supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    // フィルタリング
    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Blog posts fetch error:', error);
      return NextResponse.json({ error: 'ブログ記事の取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Blog API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// ブログ記事作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug, content, excerpt, featured_image, category, status, ai_generated, project_id } = body;

    // バリデーション
    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: 'タイトル、スラッグ、本文は必須です' },
        { status: 400 }
      );
    }

    // スラッグの重複チェック
    const { data: existingPost } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingPost) {
      return NextResponse.json(
        { error: 'このURLスラッグは既に使用されています' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title,
        slug,
        content,
        excerpt: excerpt || null,
        featured_image: featured_image || null,
        category: category || 'news',
        status: status || 'draft',
        ai_generated: ai_generated || false,
        project_id: project_id || null,
        published_at: status === 'published' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Blog post insert error:', error);
      return NextResponse.json({ error: 'ブログ記事の作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Blog API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
