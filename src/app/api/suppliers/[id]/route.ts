import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Supplier } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 発注先を更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 権限確認（admin/staffのみ）
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || !['admin', 'staff'].includes(currentUser.role)) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const body = await request.json();
    const { name, contact_person, phone, email, address, notes, is_active } = body as Partial<Supplier>;

    if (!name) {
      return NextResponse.json({ error: '発注先名は必須です' }, { status: 400 });
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .update({
        name,
        contact_person,
        phone,
        email,
        address,
        notes,
        is_active,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supplier update error:', error);
      return NextResponse.json({ error: '発注先の更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error('Suppliers PUT error:', error);
    return NextResponse.json({ error: '発注先の更新に失敗しました' }, { status: 500 });
  }
}

// 発注先を削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 権限確認（admin/staffのみ）
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || !['admin', 'staff'].includes(currentUser.role)) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    // 論理削除（is_active を false に）
    const { error } = await supabase
      .from('suppliers')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Supplier delete error:', error);
      return NextResponse.json({ error: '発注先の削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Suppliers DELETE error:', error);
    return NextResponse.json({ error: '発注先の削除に失敗しました' }, { status: 500 });
  }
}
