import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AdditionalWorkTemplate } from '@/types/database';
import { requireStaff } from '@/lib/auth';

// 追加工事マスタ一覧を取得
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

    const { data: templates, error } = await supabase
      .from('additional_work_templates')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Additional works fetch error:', error);
      return NextResponse.json({ error: '追加工事マスタの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Additional works GET error:', error);
    return NextResponse.json({ error: '追加工事マスタの取得に失敗しました' }, { status: 500 });
  }
}

// 追加工事マスタを作成
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
    const { name, category, default_price, description, notes } = body as Partial<AdditionalWorkTemplate>;

    if (!name || !category || default_price === undefined) {
      return NextResponse.json({ error: '工事名、カテゴリ、標準価格は必須です' }, { status: 400 });
    }

    const { data: template, error } = await supabase
      .from('additional_work_templates')
      .insert({
        name,
        category,
        default_price,
        description,
        notes,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Additional work create error:', error);
      return NextResponse.json({ error: '追加工事マスタの作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Additional works POST error:', error);
    return NextResponse.json({ error: '追加工事マスタの作成に失敗しました' }, { status: 500 });
  }
}
