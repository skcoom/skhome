import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { LaborRecord } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 人工記録一覧を取得
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

    // 人工記録を取得
    const { data: records, error } = await supabase
      .from('labor_records')
      .select('*')
      .eq('project_id', projectId)
      .order('work_date', { ascending: false });

    if (error) {
      console.error('Labor records fetch error:', error);
      return NextResponse.json({ error: '人工記録の取得に失敗しました' }, { status: 500 });
    }

    // 累計人工を計算
    const totalLaborCount = records?.reduce((sum, r) => sum + Number(r.worker_count), 0) || 0;

    // 予算情報と許容人工を取得
    const { data: budget } = await supabase
      .from('project_budgets')
      .select('labor_budget, material_budget, estimate_amount')
      .eq('project_id', projectId)
      .single();

    // システム設定を取得
    const { data: settings } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['labor_unit_price', 'target_profit_rate']);

    const laborUnitPrice = parseInt(settings?.find(s => s.key === 'labor_unit_price')?.value || '25000');
    const targetProfitRate = parseInt(settings?.find(s => s.key === 'target_profit_rate')?.value || '20');

    let allowableLaborCount = 0;
    let laborBudget = 0;

    if (budget) {
      const allowableCost = Math.floor(budget.estimate_amount * (1 - targetProfitRate / 100));
      laborBudget = budget.labor_budget ?? (allowableCost - budget.material_budget);
      allowableLaborCount = Math.floor(laborBudget / laborUnitPrice);
    }

    const remainingLaborCount = allowableLaborCount - totalLaborCount;

    // 月別集計
    const monthlyTotals: Record<string, number> = {};
    records?.forEach(r => {
      const month = r.work_date.substring(0, 7);
      monthlyTotals[month] = (monthlyTotals[month] || 0) + Number(r.worker_count);
    });

    return NextResponse.json({
      records,
      totalLaborCount,
      allowableLaborCount,
      remainingLaborCount,
      laborBudget,
      laborUnitPrice,
      monthlyTotals,
    });
  } catch (error) {
    console.error('Labor GET error:', error);
    return NextResponse.json({ error: '人工記録の取得に失敗しました' }, { status: 500 });
  }
}

// 人工記録を作成
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
    const { work_date, worker_count, description } = body as Partial<LaborRecord>;

    if (!work_date || worker_count === undefined) {
      return NextResponse.json({ error: '日付と人工数は必須です' }, { status: 400 });
    }

    if (worker_count <= 0) {
      return NextResponse.json({ error: '人工数は0より大きい値を入力してください' }, { status: 400 });
    }

    const { data: record, error } = await supabase
      .from('labor_records')
      .insert({
        project_id: projectId,
        work_date,
        worker_count,
        description,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Labor record create error:', error);
      return NextResponse.json({ error: '人工記録の作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error('Labor POST error:', error);
    return NextResponse.json({ error: '人工記録の作成に失敗しました' }, { status: 500 });
  }
}
