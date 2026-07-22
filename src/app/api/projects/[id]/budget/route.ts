import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProjectBudget, CostSummary } from '@/types/database';
import { requireAdmin } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 予算情報を取得
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: projectId } = await params;
    const { user, error: authError } = await requireAdmin();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }
    const supabase = await createClient();

    // 予算情報を取得
    const { data: budget, error: budgetError } = await supabase
      .from('project_budgets')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (budgetError && budgetError.code !== 'PGRST116') {
      console.error('Budget fetch error:', budgetError);
      return NextResponse.json({ error: '予算情報の取得に失敗しました' }, { status: 500 });
    }

    // システム設定を取得
    const { data: settings } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['labor_unit_price', 'target_profit_rate']);

    const laborUnitPrice = parseInt(settings?.find(s => s.key === 'labor_unit_price')?.value || '25000');
    const targetProfitRate = parseInt(settings?.find(s => s.key === 'target_profit_rate')?.value || '20');

    // 予算が未設定の場合
    if (!budget) {
      return NextResponse.json({
        budget: null,
        costSummary: null,
        settings: { laborUnitPrice, targetProfitRate },
      });
    }

    // 発注合計を取得
    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount, tax_amount')
      .eq('project_id', projectId)
      .neq('status', 'draft');

    const materialSpent = orders?.reduce((sum, o) => sum + o.total_amount + (o.tax_amount || 0), 0) || 0;

    // 人工合計を取得
    const { data: laborRecords } = await supabase
      .from('labor_records')
      .select('worker_count')
      .eq('project_id', projectId);

    const laborSpentCount = laborRecords?.reduce((sum, r) => sum + Number(r.worker_count), 0) || 0;

    // 受注した追加工事の合計を取得
    const { data: acceptedAdditionalWorks } = await supabase
      .from('project_additional_works')
      .select('price')
      .eq('project_id', projectId)
      .eq('status', 'accepted');

    const additionalWorksTotal = acceptedAdditionalWorks?.reduce((sum, w) => sum + w.price, 0) || 0;

    // 計算ロジック
    const totalEstimate = budget.estimate_amount + additionalWorksTotal;
    const allowableCost = Math.floor(totalEstimate * (1 - targetProfitRate / 100));
    const laborBudget = budget.labor_budget ?? (allowableCost - budget.material_budget);
    const allowableLaborCount = Math.floor(laborBudget / laborUnitPrice);
    const laborSpent = laborSpentCount * laborUnitPrice;
    const remainingMaterial = budget.material_budget - materialSpent;
    const remainingLabor = allowableLaborCount - laborSpentCount;
    const materialPercentage = budget.material_budget > 0 ? Math.round((materialSpent / budget.material_budget) * 100) : 0;
    const laborPercentage = allowableLaborCount > 0 ? Math.round((laborSpentCount / allowableLaborCount) * 100) : 0;
    const projectedCost = materialSpent + laborSpent;
    const projectedProfit = totalEstimate - projectedCost;
    const projectedProfitRate = totalEstimate > 0 ? Math.round((projectedProfit / totalEstimate) * 100) : 0;

    const costSummary: CostSummary = {
      estimate_amount: totalEstimate,
      allowable_cost: allowableCost,
      material_budget: budget.material_budget,
      labor_budget: laborBudget,
      allowable_labor_count: allowableLaborCount,
      material_spent: materialSpent,
      labor_spent: laborSpentCount,
      remaining_material: remainingMaterial,
      remaining_labor: remainingLabor,
      material_percentage: materialPercentage,
      labor_percentage: laborPercentage,
      projected_cost: projectedCost,
      projected_profit: projectedProfit,
      projected_profit_rate: projectedProfitRate,
    };

    return NextResponse.json({
      budget,
      costSummary,
      settings: { laborUnitPrice, targetProfitRate },
      additionalWorksTotal,
    });
  } catch (error) {
    console.error('Budget GET error:', error);
    return NextResponse.json({ error: '予算情報の取得に失敗しました' }, { status: 500 });
  }
}

// 予算を作成または更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: projectId } = await params;
    const { user, error: authError } = await requireAdmin();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }
    const supabase = await createClient();

    const body = await request.json();
    const { estimate_amount, material_budget, labor_budget, notes } = body as Partial<ProjectBudget>;

    if (!estimate_amount || !material_budget) {
      return NextResponse.json({ error: '見積金額と材料費予算は必須です' }, { status: 400 });
    }

    // 既存の予算を確認
    const { data: existing } = await supabase
      .from('project_budgets')
      .select('id')
      .eq('project_id', projectId)
      .single();

    let result;
    if (existing) {
      // 更新
      result = await supabase
        .from('project_budgets')
        .update({
          estimate_amount,
          material_budget,
          labor_budget,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('project_id', projectId)
        .select()
        .single();
    } else {
      // 新規作成
      result = await supabase
        .from('project_budgets')
        .insert({
          project_id: projectId,
          estimate_amount,
          material_budget,
          labor_budget,
          notes,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Budget save error:', result.error);
      return NextResponse.json({ error: '予算の保存に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ budget: result.data });
  } catch (error) {
    console.error('Budget PUT error:', error);
    return NextResponse.json({ error: '予算の保存に失敗しました' }, { status: 500 });
  }
}
