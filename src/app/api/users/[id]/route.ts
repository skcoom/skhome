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

    if (id === user.id && role && role !== 'admin') {
      return NextResponse.json(
        { error: '自分自身の管理者権限は変更できません' },
        { status: 409 },
      );
    }

    if (role && role !== 'admin') {
      const adminClient = createAdminClient();
      const [{ data: target }, { count: adminCount }] = await Promise.all([
        adminClient.from('users').select('role').eq('id', id).single(),
        adminClient.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      ]);
      if (target?.role === 'admin' && (adminCount || 0) <= 1) {
        return NextResponse.json(
          { error: '最後の管理者の役割は変更できません' },
          { status: 409 },
        );
      }
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

    const adminClient = createAdminClient();
    const { data: target, error: targetError } = await adminClient
      .from('users')
      .select('id, auth_user_id, role')
      .eq('id', id)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    if (target.id === user.id) {
      return NextResponse.json(
        { error: 'ログイン中の自分自身は削除できません' },
        { status: 409 },
      );
    }

    if (target.role === 'admin') {
      const { count: adminCount } = await adminClient
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      if ((adminCount || 0) <= 1) {
        return NextResponse.json(
          { error: '最後の管理者は削除できません' },
          { status: 409 },
        );
      }
    }

    // 先にログイン資格を削除し、削除途中でも管理画面へ入れない状態を保つ。
    if (target.auth_user_id) {
      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(target.auth_user_id);

      if (authDeleteError) {
        console.error('Auth user delete error:', authDeleteError);
        return NextResponse.json({ error: 'ログインアカウントの削除に失敗しました' }, { status: 500 });
      }
    }

    // auth_user_idがない旧データ、またはcascadeされなかったプロフィールを削除する。
    const { error: profileDeleteError } = await adminClient
      .from('users')
      .delete()
      .eq('id', id);

    if (profileDeleteError) {
      console.error('User profile delete error:', profileDeleteError);
      return NextResponse.json({ error: 'ユーザー情報の削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
