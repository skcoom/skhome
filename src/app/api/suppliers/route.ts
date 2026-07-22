import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Supplier } from '@/types/database';
import { requireStaff } from '@/lib/auth';

// 発注先一覧を取得
export async function GET(): Promise<NextResponse> {
  try {
    const { user, error: authError } = await requireStaff();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }
    const supabase = await createClient();

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
    const { user, error: authError } = await requireStaff();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }
    const supabase = await createClient();

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
