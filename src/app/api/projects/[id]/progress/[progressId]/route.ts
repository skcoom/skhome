import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProgressPhase } from '@/types/database';
import { requirePermission } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; progressId: string }>;
}

// 進捗を更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: projectId, progressId } = await params;
    const { user, error: authError } = await requirePermission('projects:write');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }
    const supabase = await createClient();

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
      .eq('project_id', projectId)
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
    const { id: projectId, progressId } = await params;
    const { user, error: authError } = await requirePermission('projects:write');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }
    const supabase = await createClient();

    const { error } = await supabase
      .from('project_progress')
      .delete()
      .eq('id', progressId)
      .eq('project_id', projectId);

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
