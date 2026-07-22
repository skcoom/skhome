import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Supplier } from '@/types/database';
import { requireStaff } from '@/lib/auth';

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
    const { user, error: authError } = await requireStaff();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }
    const supabase = await createClient();

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
    const { user, error: authError } = await requireStaff();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }
    const supabase = await createClient();

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
