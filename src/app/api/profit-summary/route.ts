import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProfitSummary, ProjectStatus } from '@/types/database';
import { requireAdmin } from '@/lib/auth';

// 利益サマリーを取得
export async function GET(): Promise<NextResponse> {
  try {
    const { user, error: authError } = await requireAdmin();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }

    const supabase = await createClient();

    // システム設定を取得
    const { data: settings } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['labor_unit_price', 'target_profit_rate']);

    const laborUnitPrice = parseInt(settings?.find(s => s.key === 'labor_unit_price')?.value || '25000');
    const targetProfitRate = parseInt(settings?.find(s => s.key === 'target_profit_rate')?.value || '20');

    // すべてのプロジェクトを取得
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, status')
      .in('status', ['planning', 'in_progress']);

    if (projectsError) {
      console.error('Projects fetch error:', projectsError);
      return NextResponse.json({ error: 'プロジェクトの取得に失敗しました' }, { status: 500 });
    }

    // 各プロジェクトの予算・コスト情報を取得
    const summaries: ProfitSummary[] = [];

    for (const project of projects || []) {
      // 予算情報を取得
      const { data: budget } = await supabase
        .from('project_budgets')
        .select('*')
        .eq('project_id', project.id)
        .single();

      if (!budget) continue; // 予算未設定はスキップ

      // 発注合計を取得
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, tax_amount')
        .eq('project_id', project.id)
        .neq('status', 'draft');

      const materialSpent = orders?.reduce((sum, o) => sum + o.total_amount + (o.tax_amount || 0), 0) || 0;

      // 人工合計を取得
      const { data: laborRecords } = await supabase
        .from('labor_records')
        .select('worker_count')
        .eq('project_id', project.id);

      const laborSpentCount = laborRecords?.reduce((sum, r) => sum + Number(r.worker_count), 0) || 0;

      // 受注した追加工事の合計を取得
      const { data: acceptedAdditionalWorks } = await supabase
        .from('project_additional_works')
        .select('price')
        .eq('project_id', project.id)
        .eq('status', 'accepted');

      const additionalWorksTotal = acceptedAdditionalWorks?.reduce((sum, w) => sum + w.price, 0) || 0;

      // 計算
      const totalEstimate = budget.estimate_amount + additionalWorksTotal;
      const allowableCost = Math.floor(totalEstimate * (1 - targetProfitRate / 100));
      const laborBudget = budget.labor_budget ?? (allowableCost - budget.material_budget);
      const allowableLaborCount = Math.floor(laborBudget / laborUnitPrice);
      const laborSpent = laborSpentCount * laborUnitPrice;
      const materialPercentage = budget.material_budget > 0 ? Math.round((materialSpent / budget.material_budget) * 100) : 0;
      const laborPercentage = allowableLaborCount > 0 ? Math.round((laborSpentCount / allowableLaborCount) * 100) : 0;
      const projectedCost = materialSpent + laborSpent;
      const projectedProfitRate = totalEstimate > 0 ? Math.round(((totalEstimate - projectedCost) / totalEstimate) * 100) : 0;
      const remainingLaborCount = allowableLaborCount - laborSpentCount;

      // 警告判定
      const isOverBudget = materialPercentage > 100 || laborPercentage > 100;
      const isNearLimit = !isOverBudget && (materialPercentage >= 80 || laborPercentage >= 80);
      const isProfitWarning = projectedProfitRate < targetProfitRate;

      const hasWarning = isOverBudget || isNearLimit || isProfitWarning;
      const warningType = isOverBudget ? 'over_budget' : (isNearLimit || isProfitWarning) ? 'near_limit' : undefined;

      summaries.push({
        project_id: project.id,
        project_name: project.name,
        status: project.status as ProjectStatus,
        estimate_amount: totalEstimate,
        material_budget: budget.material_budget,
        labor_budget: laborBudget,
        material_spent: materialSpent,
        labor_spent: laborSpentCount,
        material_percentage: materialPercentage,
        labor_percentage: laborPercentage,
        projected_profit_rate: projectedProfitRate,
        remaining_labor_count: remainingLaborCount,
        has_warning: hasWarning,
        warning_type: warningType,
      });
    }

    // 警告のあるプロジェクトを上位に並べる
    summaries.sort((a, b) => {
      if (a.has_warning && !b.has_warning) return -1;
      if (!a.has_warning && b.has_warning) return 1;
      if (a.warning_type === 'over_budget' && b.warning_type !== 'over_budget') return -1;
      if (a.warning_type !== 'over_budget' && b.warning_type === 'over_budget') return 1;
      return 0;
    });

    return NextResponse.json({
      summaries,
      settings: { laborUnitPrice, targetProfitRate },
    });
  } catch (error) {
    console.error('Profit summary GET error:', error);
    return NextResponse.json({ error: '利益サマリーの取得に失敗しました' }, { status: 500 });
  }
}
