import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProjectAdditionalWork } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string; workId: string }>;
}

// 現場別追加工事を更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { workId } = await params;
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
    const { name, price, status, notes } = body as Partial<ProjectAdditionalWork>;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const { data: work, error } = await supabase
      .from('project_additional_works')
      .update(updateData)
      .eq('id', workId)
      .select()
      .single();

    if (error) {
      console.error('Project additional work update error:', error);
      return NextResponse.json({ error: '追加工事の更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ work });
  } catch (error) {
    console.error('Project additional works PUT error:', error);
    return NextResponse.json({ error: '追加工事の更新に失敗しました' }, { status: 500 });
  }
}

// 現場別追加工事を削除
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { workId } = await params;
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

    const { error } = await supabase
      .from('project_additional_works')
      .delete()
      .eq('id', workId);

    if (error) {
      console.error('Project additional work delete error:', error);
      return NextResponse.json({ error: '追加工事の削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Project additional works DELETE error:', error);
    return NextResponse.json({ error: '追加工事の削除に失敗しました' }, { status: 500 });
  }
}
