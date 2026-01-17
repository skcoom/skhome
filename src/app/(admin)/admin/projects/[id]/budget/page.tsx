'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BudgetForm } from '@/components/admin/budget/budget-form';
import { CostSummaryCard } from '@/components/admin/budget/cost-summary-card';
import type { ProjectBudget, CostSummary, Project } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

interface BudgetData {
  budget: ProjectBudget | null;
  costSummary: CostSummary | null;
  settings: {
    laborUnitPrice: number;
    targetProfitRate: number;
  };
  additionalWorksTotal?: number;
}

export default function ProjectBudgetPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();
  const [project, setProject] = useState<Project | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // プロジェクト情報を取得
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) {
        throw new Error('プロジェクトの取得に失敗しました');
      }
      setProject(projectData);

      // 予算情報を取得
      const response = await fetch(`/api/projects/${projectId}/budget`);
      if (!response.ok) {
        throw new Error('予算情報の取得に失敗しました');
      }
      const data = await response.json();
      setBudgetData(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (budget: Partial<ProjectBudget>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budget),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存に失敗しました');
      }

      // データを再取得
      await fetchData();
      alert('予算を保存しました');
    } catch (err) {
      console.error('Save error:', err);
      alert(err instanceof Error ? err.message : '保存に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <div className="text-red-500 mb-4">{error || 'プロジェクトが見つかりません'}</div>
        <Link href="/admin/projects">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            一覧に戻る
          </Button>
        </Link>
      </div>
    );
  }

  const { budget, costSummary, settings, additionalWorksTotal } = budgetData || {
    budget: null,
    costSummary: null,
    settings: { laborUnitPrice: 25000, targetProfitRate: 20 },
    additionalWorksTotal: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start space-x-4">
        <Link
          href={`/admin/projects/${projectId}`}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">予算設定</h1>
          <p className="text-gray-500 mt-1">{project.name}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 予算設定フォーム */}
        <BudgetForm
          projectId={projectId}
          initialBudget={budget}
          laborUnitPrice={settings.laborUnitPrice}
          targetProfitRate={settings.targetProfitRate}
          onSave={handleSave}
        />

        {/* コスト消化状況 */}
        {costSummary && (
          <CostSummaryCard
            costSummary={costSummary}
            laborUnitPrice={settings.laborUnitPrice}
            targetProfitRate={settings.targetProfitRate}
            additionalWorksTotal={additionalWorksTotal}
          />
        )}

        {/* 予算未設定の場合のガイド */}
        {!costSummary && (
          <div className="rounded-lg bg-gray-50 p-6 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">コスト消化状況</p>
              <p className="mt-2">予算を設定すると、ここに消化状況が表示されます</p>
            </div>
          </div>
        )}
      </div>

      {/* 関連リンク */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">関連機能</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href={`/admin/projects/${projectId}/orders`}
            className="block p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-gray-900">発注管理</p>
            <p className="text-sm text-gray-500 mt-1">材料費の発注を登録</p>
          </Link>
          <Link
            href={`/admin/projects/${projectId}/labor`}
            className="block p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-gray-900">人工管理</p>
            <p className="text-sm text-gray-500 mt-1">人工の記録を登録</p>
          </Link>
          <Link
            href={`/admin/projects/${projectId}/additional`}
            className="block p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-gray-900">追加工事</p>
            <p className="text-sm text-gray-500 mt-1">追加工事の提案・管理</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
