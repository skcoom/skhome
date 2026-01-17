import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProjectProgressExtended, ProgressPhase } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 進捗一覧を取得
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    // 認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: progress, error } = await supabase
      .from('project_progress')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Progress fetch error:', error);
      return NextResponse.json({ error: '進捗の取得に失敗しました' }, { status: 500 });
    }

    // 最新の進捗率を取得
    const latestProgress = progress?.find(p => (p as unknown as ProjectProgressExtended).progress_percentage !== undefined && (p as unknown as ProjectProgressExtended).progress_percentage !== null);
    const currentProgressPercentage = latestProgress ? ((latestProgress as unknown as ProjectProgressExtended).progress_percentage || 0) : 0;

    return NextResponse.json({
      progress,
      currentProgressPercentage,
    });
  } catch (error) {
    console.error('Progress GET error:', error);
    return NextResponse.json({ error: '進捗の取得に失敗しました' }, { status: 500 });
  }
}

// 進捗を追加
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: projectId } = await params;
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

    const insertData: Record<string, unknown> = {
      project_id: projectId,
      date,
      description,
      created_by: user.id,
    };

    if (phase) insertData.phase = phase;
    if (progress_percentage !== undefined) insertData.progress_percentage = progress_percentage;

    const { data: progress, error } = await supabase
      .from('project_progress')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Progress create error:', error);
      return NextResponse.json({ error: '進捗の作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ progress }, { status: 201 });
  } catch (error) {
    console.error('Progress POST error:', error);
    return NextResponse.json({ error: '進捗の作成に失敗しました' }, { status: 500 });
  }
}
