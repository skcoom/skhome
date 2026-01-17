'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Calculator,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Settings,
  Users,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProfitSummary } from '@/types/database';

function formatCurrency(value: number): string {
  if (value >= 10000) {
    return `${Math.round(value / 10000)}万円`;
  }
  return `${value.toLocaleString()}円`;
}

const statusLabels = {
  planning: { label: '計画中', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: '施工中', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '完了', color: 'bg-green-100 text-green-800' },
};

function ProgressBar({ percentage, isWarning, isOver }: { percentage: number; isWarning: boolean; isOver: boolean }) {
  const color = isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
      <div
        className={`h-full transition-all duration-300 ${color}`}
        style={{ width: `${Math.min(100, percentage)}%` }}
      />
    </div>
  );
}

export default function ProfitPage() {
  const [summaries, setSummaries] = useState<ProfitSummary[]>([]);
  const [settings, setSettings] = useState({ laborUnitPrice: 25000, targetProfitRate: 20 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profit-summary');
      if (!response.ok) throw new Error('取得に失敗しました');
      const data = await response.json();
      setSummaries(data.summaries || []);
      setSettings(data.settings || { laborUnitPrice: 25000, targetProfitRate: 20 });
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 統計値
  const warningCount = summaries.filter(s => s.has_warning).length;
  const overBudgetCount = summaries.filter(s => s.warning_type === 'over_budget').length;
  const avgProfitRate = summaries.length > 0
    ? Math.round(summaries.reduce((sum, s) => sum + s.projected_profit_rate, 0) / summaries.length)
    : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">利益管理</h1>
          <p className="text-gray-500 mt-1">全現場のコスト消化状況と利益率を監視します</p>
        </div>
        <Link href="/admin/settings/cost">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            コスト設定
          </Button>
        </Link>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-500">対象現場数</p>
          <p className="text-2xl font-bold text-gray-900">{summaries.length}件</p>
        </div>
        <div className={`rounded-lg p-4 shadow ${warningCount > 0 ? 'bg-yellow-50' : 'bg-white'}`}>
          <p className="text-sm text-gray-500">要注意</p>
          <p className={`text-2xl font-bold ${warningCount > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
            {warningCount}件
          </p>
        </div>
        <div className={`rounded-lg p-4 shadow ${overBudgetCount > 0 ? 'bg-red-50' : 'bg-white'}`}>
          <p className="text-sm text-gray-500">予算超過</p>
          <p className={`text-2xl font-bold ${overBudgetCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {overBudgetCount}件
          </p>
        </div>
        <div className={`rounded-lg p-4 shadow ${avgProfitRate < settings.targetProfitRate ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className="text-sm text-gray-500">平均利益率</p>
          <div className="flex items-center">
            <p className={`text-2xl font-bold ${avgProfitRate < settings.targetProfitRate ? 'text-red-600' : 'text-green-600'}`}>
              {avgProfitRate}%
            </p>
            {avgProfitRate >= settings.targetProfitRate ? (
              <TrendingUp className="ml-2 h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="ml-2 h-5 w-5 text-red-500" />
            )}
          </div>
          <p className="text-xs text-gray-500">目標: {settings.targetProfitRate}%</p>
        </div>
      </div>

      {/* 現場一覧 */}
      <div className="rounded-lg bg-white shadow overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">現場別コスト状況</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">現場名</th>
                <th className="px-4 py-3 text-left">ステータス</th>
                <th className="px-4 py-3 text-right">見積金額</th>
                <th className="px-4 py-3 text-center">材料費消化</th>
                <th className="px-4 py-3 text-center">人工消化</th>
                <th className="px-4 py-3 text-center">利益率予測</th>
                <th className="px-4 py-3 text-center">残り人工</th>
                <th className="px-4 py-3 text-center">警告</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {summaries.map((summary) => {
                const isMaterialOver = summary.material_percentage > 100;
                const isMaterialWarning = summary.material_percentage >= 80;
                const isLaborOver = summary.labor_percentage > 100;
                const isLaborWarning = summary.labor_percentage >= 80;
                const isProfitOk = summary.projected_profit_rate >= settings.targetProfitRate;

                return (
                  <tr
                    key={summary.project_id}
                    className={`hover:bg-gray-50 ${summary.warning_type === 'over_budget' ? 'bg-red-50' : summary.has_warning ? 'bg-yellow-50' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/projects/${summary.project_id}/budget`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {summary.project_name}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusLabels[summary.status].color}`}>
                        {statusLabels[summary.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {formatCurrency(summary.estimate_amount)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <ProgressBar
                          percentage={summary.material_percentage}
                          isWarning={isMaterialWarning}
                          isOver={isMaterialOver}
                        />
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center">
                            <Package className="h-3 w-3 mr-1 text-gray-400" />
                            {formatCurrency(summary.material_spent)}
                          </span>
                          <span className={isMaterialOver ? 'text-red-600 font-medium' : isMaterialWarning ? 'text-yellow-600' : 'text-gray-500'}>
                            {summary.material_percentage}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <ProgressBar
                          percentage={summary.labor_percentage}
                          isWarning={isLaborWarning}
                          isOver={isLaborOver}
                        />
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1 text-gray-400" />
                            {summary.labor_spent}人工
                          </span>
                          <span className={isLaborOver ? 'text-red-600 font-medium' : isLaborWarning ? 'text-yellow-600' : 'text-gray-500'}>
                            {summary.labor_percentage}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`text-lg font-bold ${isProfitOk ? 'text-green-600' : 'text-red-600'}`}>
                        {summary.projected_profit_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={summary.remaining_labor_count < 0 ? 'text-red-600 font-medium' : summary.remaining_labor_count < 5 ? 'text-yellow-600' : 'text-gray-700'}>
                        {summary.remaining_labor_count >= 0 ? `${summary.remaining_labor_count}人工` : `${Math.abs(summary.remaining_labor_count)}超過`}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {summary.has_warning && (
                        <AlertTriangle className={`h-5 w-5 mx-auto ${summary.warning_type === 'over_budget' ? 'text-red-500' : 'text-yellow-500'}`} />
                      )}
                    </td>
                  </tr>
                );
              })}

              {summaries.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>予算設定された現場がありません</p>
                    <p className="text-sm">現場詳細から予算を設定してください</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
