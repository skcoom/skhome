import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth';

// 現場一覧取得（公開ページからも使用されるため認証不要）
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const isPublic = searchParams.get('public');

    let query = supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    // フィルタリング
    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (isPublic === 'true') {
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Projects fetch error:', error);
      return NextResponse.json({ error: '現場一覧の取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Projects API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// 現場新規作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { name, client_name, address, category, status, start_date, end_date, description, is_public } = body;

    // バリデーション
    if (!name) {
      return NextResponse.json({ error: '工事名は必須です' }, { status: 400 });
    }

    // ユーザープロファイルを取得
    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        client_name: client_name || null,
        address: address || null,
        category: category || 'remodeling',
        status: status || 'planning',
        start_date: start_date || null,
        end_date: end_date || null,
        description: description || null,
        is_public: is_public || false,
        created_by: userProfile?.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Project insert error:', error);
      return NextResponse.json({ error: '現場の登録に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Projects API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
