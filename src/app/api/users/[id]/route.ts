import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

type Params = Promise<{ id: string }>;

// ユーザー詳細取得（管理者のみ）
export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;

    // 管理者権限チェック
    const { user, error: authError } = await requireAdmin();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('User fetch error:', error);
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('User API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// ユーザー更新（管理者のみ）
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;

    // 管理者権限チェック
    const { user, error: authError } = await requireAdmin();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();
    const { name, role, company_name } = body;

    if (role && !['admin', 'staff', 'partner'].includes(role)) {
      return NextResponse.json(
        { error: '有効な役割を指定してください' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (company_name !== undefined) updateData.company_name = company_name;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('User update error:', error);
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('User API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// ユーザー削除（管理者のみ）
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;

    // 管理者権限チェック
    const { user, error: authError } = await requireAdmin();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();

    // usersテーブルから削除
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('User delete error:', error);
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }

    // Supabase Authからも削除
    const adminClient = createAdminClient();
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(id);

    if (authDeleteError) {
      console.error('Auth user delete error:', authDeleteError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
