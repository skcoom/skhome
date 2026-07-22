import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { LaborRecord } from '@/types/database';
import { requireStaff } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; laborId: string }>;
}

// 人工記録を更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: projectId, laborId } = await params;
    const { user, error: authError } = await requireStaff();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }
    const supabase = await createClient();

    const body = await request.json();
    const { work_date, worker_count, description } = body as Partial<LaborRecord>;

    if (!work_date || worker_count === undefined) {
      return NextResponse.json({ error: '日付と人工数は必須です' }, { status: 400 });
    }

    if (worker_count <= 0) {
      return NextResponse.json({ error: '人工数は0より大きい値を入力してください' }, { status: 400 });
    }

    const { data: record, error } = await supabase
      .from('labor_records')
      .update({
        work_date,
        worker_count,
        description,
      })
      .eq('id', laborId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Labor record update error:', error);
      return NextResponse.json({ error: '人工記録の更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ record });
  } catch (error) {
    console.error('Labor PUT error:', error);
    return NextResponse.json({ error: '人工記録の更新に失敗しました' }, { status: 500 });
  }
}

// 人工記録を削除
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: projectId, laborId } = await params;
    const { user, error: authError } = await requireStaff();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }
    const supabase = await createClient();

    const { error } = await supabase
      .from('labor_records')
      .delete()
      .eq('id', laborId)
      .eq('project_id', projectId);

    if (error) {
      console.error('Labor record delete error:', error);
      return NextResponse.json({ error: '人工記録の削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Labor DELETE error:', error);
    return NextResponse.json({ error: '人工記録の削除に失敗しました' }, { status: 500 });
  }
}
