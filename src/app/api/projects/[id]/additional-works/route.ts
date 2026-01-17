import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProjectAdditionalWork } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 現場別追加工事一覧を取得
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

    const { data: works, error } = await supabase
      .from('project_additional_works')
      .select(`
        *,
        template:additional_work_templates(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Project additional works fetch error:', error);
      return NextResponse.json({ error: '追加工事の取得に失敗しました' }, { status: 500 });
    }

    // ステータス別集計
    const statusSummary = {
      proposed: works?.filter(w => w.status === 'proposed') || [],
      accepted: works?.filter(w => w.status === 'accepted') || [],
      declined: works?.filter(w => w.status === 'declined') || [],
    };

    const acceptedTotal = statusSummary.accepted.reduce((sum, w) => sum + w.price, 0);
    const proposedTotal = statusSummary.proposed.reduce((sum, w) => sum + w.price, 0);

    return NextResponse.json({
      works,
      statusSummary,
      acceptedTotal,
      proposedTotal,
    });
  } catch (error) {
    console.error('Project additional works GET error:', error);
    return NextResponse.json({ error: '追加工事の取得に失敗しました' }, { status: 500 });
  }
}

// 現場別追加工事を追加
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
    const { template_id, name, price, status, notes } = body as Partial<ProjectAdditionalWork>;

    if (!name || price === undefined) {
      return NextResponse.json({ error: '工事名と金額は必須です' }, { status: 400 });
    }

    const { data: work, error } = await supabase
      .from('project_additional_works')
      .insert({
        project_id: projectId,
        template_id,
        name,
        price,
        status: status || 'proposed',
        notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Project additional work create error:', error);
      return NextResponse.json({ error: '追加工事の作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ work }, { status: 201 });
  } catch (error) {
    console.error('Project additional works POST error:', error);
    return NextResponse.json({ error: '追加工事の作成に失敗しました' }, { status: 500 });
  }
}
