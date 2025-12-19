import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = Promise<{ id: string }>;

// プロジェクトのメディア一覧取得
export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const phase = searchParams.get('phase');

    let query = supabase
      .from('project_media')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    if (phase) {
      query = query.eq('phase', phase);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Media fetch error:', error);
      return NextResponse.json({ error: 'メディアの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Media API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// メディア情報を登録（ファイルアップロード後）
export async function POST(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { type, phase, file_url, thumbnail_url, caption, is_featured } = body;

    // バリデーション
    if (!file_url) {
      return NextResponse.json({ error: 'ファイルURLは必須です' }, { status: 400 });
    }

    // ユーザープロファイルを取得
    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    const { data, error } = await supabase
      .from('project_media')
      .insert({
        project_id: id,
        type: type || 'image',
        phase: phase || 'during',
        file_url,
        thumbnail_url: thumbnail_url || null,
        caption: caption || null,
        uploaded_by: userProfile?.id || null,
        is_featured: is_featured || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Media insert error:', error);
      return NextResponse.json({ error: 'メディアの登録に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Media API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// メディアのis_featuredを更新
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  try {
    await params; // paramsを使用（lintエラー回避）
    const supabase = await createClient();

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { mediaIds, is_featured } = body;

    if (!mediaIds || !Array.isArray(mediaIds)) {
      return NextResponse.json({ error: 'mediaIdsは配列で指定してください' }, { status: 400 });
    }

    // 複数のメディアを一括更新
    const { data, error } = await supabase
      .from('project_media')
      .update({ is_featured: is_featured ?? true })
      .in('id', mediaIds)
      .select();

    if (error) {
      console.error('Media update error:', error);
      return NextResponse.json({ error: 'メディアの更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated: data,
      message: `${data.length}件のメディアを更新しました`,
    });
  } catch (error) {
    console.error('Media PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
