import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AdditionalWorkTemplate } from '@/types/database';
import { requireStaff } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 追加工事マスタを更新
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
    const { name, category, default_price, description, notes, is_active } = body as Partial<AdditionalWorkTemplate>;

    if (!name || !category || default_price === undefined) {
      return NextResponse.json({ error: '工事名、カテゴリ、標準価格は必須です' }, { status: 400 });
    }

    const { data: template, error } = await supabase
      .from('additional_work_templates')
      .update({
        name,
        category,
        default_price,
        description,
        notes,
        is_active,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Additional work update error:', error);
      return NextResponse.json({ error: '追加工事マスタの更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Additional works PUT error:', error);
    return NextResponse.json({ error: '追加工事マスタの更新に失敗しました' }, { status: 500 });
  }
}

// 追加工事マスタを削除（論理削除）
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

    // 論理削除
    const { error } = await supabase
      .from('additional_work_templates')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Additional work delete error:', error);
      return NextResponse.json({ error: '追加工事マスタの削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Additional works DELETE error:', error);
    return NextResponse.json({ error: '追加工事マスタの削除に失敗しました' }, { status: 500 });
  }
}
