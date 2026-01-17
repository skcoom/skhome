import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Supplier } from '@/types/database';

// 発注先一覧を取得
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // 認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Suppliers fetch error:', error);
      return NextResponse.json({ error: '発注先の取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error('Suppliers GET error:', error);
    return NextResponse.json({ error: '発注先の取得に失敗しました' }, { status: 500 });
  }
}

// 発注先を作成
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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
    const { name, contact_person, phone, email, address, notes } = body as Partial<Supplier>;

    if (!name) {
      return NextResponse.json({ error: '発注先名は必須です' }, { status: 400 });
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({
        name,
        contact_person,
        phone,
        email,
        address,
        notes,
        created_by: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Supplier create error:', error);
      return NextResponse.json({ error: '発注先の作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    console.error('Suppliers POST error:', error);
    return NextResponse.json({ error: '発注先の作成に失敗しました' }, { status: 500 });
  }
}
