import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProgressPhase } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string; progressId: string }>;
}

// 進捗を更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { progressId } = await params;
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
    const { date, description, phase, progress_percentage } = body as {
      date: string;
      description: string;
      phase?: ProgressPhase;
      progress_percentage?: number;
    };

    if (!date || !description) {
      return NextResponse.json({ error: '日付と説明は必須です' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      date,
      description,
    };

    if (phase !== undefined) updateData.phase = phase;
    if (progress_percentage !== undefined) updateData.progress_percentage = progress_percentage;

    const { data: progress, error } = await supabase
      .from('project_progress')
      .update(updateData)
      .eq('id', progressId)
      .select()
      .single();

    if (error) {
      console.error('Progress update error:', error);
      return NextResponse.json({ error: '進捗の更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Progress PUT error:', error);
    return NextResponse.json({ error: '進捗の更新に失敗しました' }, { status: 500 });
  }
}

// 進捗を削除
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { progressId } = await params;
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
      .from('project_progress')
      .delete()
      .eq('id', progressId);

    if (error) {
      console.error('Progress delete error:', error);
      return NextResponse.json({ error: '進捗の削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Progress DELETE error:', error);
    return NextResponse.json({ error: '進捗の削除に失敗しました' }, { status: 500 });
  }
}
