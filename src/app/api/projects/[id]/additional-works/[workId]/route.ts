import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProjectAdditionalWork } from '@/types/database';
import { requireStaff } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; workId: string }>;
}

// 現場別追加工事を更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: projectId, workId } = await params;
    const { user, error: authError } = await requireStaff();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }
    const supabase = await createClient();

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
      .eq('project_id', projectId)
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
    const { id: projectId, workId } = await params;
    const { user, error: authError } = await requireStaff();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }
    const supabase = await createClient();

    const { error } = await supabase
      .from('project_additional_works')
      .delete()
      .eq('id', workId)
      .eq('project_id', projectId);

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
