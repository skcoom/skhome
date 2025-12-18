import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = Promise<{ id: string }>;

// ブログ記事詳細取得（IDまたはスラッグで取得）
export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // UUIDかどうかを判定
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase
      .from('blog_posts')
      .select('*');

    if (isUUID) {
      query = query.eq('id', id);
    } else {
      query = query.eq('slug', id);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Blog post fetch error:', error);
      return NextResponse.json({ error: '記事が見つかりません' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Blog API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// ブログ記事更新
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug, content, excerpt, featured_image, category, status, project_id } = body;

    // 現在の記事を取得
    const { data: currentPost } = await supabase
      .from('blog_posts')
      .select('status, published_at')
      .eq('id', id)
      .single() as { data: { status: string; published_at: string | null } | null };

    // スラッグの重複チェック（自分以外）
    if (slug) {
      const { data: existingPost } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .single();

      if (existingPost) {
        return NextResponse.json(
          { error: 'このURLスラッグは既に使用されています' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (content !== undefined) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (featured_image !== undefined) updateData.featured_image = featured_image;
    if (category !== undefined) updateData.category = category;
    if (status !== undefined) updateData.status = status;
    if (project_id !== undefined) updateData.project_id = project_id;

    // 初回公開時にpublished_atを設定
    if (status === 'published' && currentPost?.status !== 'published') {
      updateData.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Blog post update error:', error);
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Blog API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// ブログ記事削除
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Blog post delete error:', error);
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Blog API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
