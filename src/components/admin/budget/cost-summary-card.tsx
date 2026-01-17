'use client';

import { Calculator, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { CostSummary } from '@/types/database';

interface CostSummaryCardProps {
  costSummary: CostSummary;
  laborUnitPrice: number;
  targetProfitRate: number;
  additionalWorksTotal?: number;
}

function formatCurrency(value: number): string {
  if (value >= 10000) {
    return `${Math.round(value / 10000)}万円`;
  }
  return `${value.toLocaleString()}円`;
}

function ProgressBar({ percentage, color }: { percentage: number; color: string }) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  return (
    <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
      <div
        className={`h-full transition-all duration-500 ${color}`}
        style={{ width: `${clampedPercentage}%` }}
      />
    </div>
  );
}

export function CostSummaryCard({
  costSummary,
  laborUnitPrice,
  targetProfitRate,
  additionalWorksTotal = 0,
}: CostSummaryCardProps) {
  const {
    estimate_amount,
    allowable_cost,
    material_budget,
    labor_budget,
    allowable_labor_count,
    material_spent,
    labor_spent,
    remaining_material,
    remaining_labor,
    material_percentage,
    labor_percentage,
    projected_profit_rate,
  } = costSummary;

  const isMaterialWarning = material_percentage >= 80;
  const isMaterialOver = material_percentage > 100;
  const isLaborWarning = labor_percentage >= 80;
  const isLaborOver = labor_percentage > 100;
  const isProfitOk = projected_profit_rate >= targetProfitRate;

  const getMaterialColor = () => {
    if (isMaterialOver) return 'bg-red-500';
    if (isMaterialWarning) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getLaborColor = () => {
    if (isLaborOver) return 'bg-red-500';
    if (isLaborWarning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center space-x-2 mb-4">
        <Calculator className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">コスト管理</h3>
      </div>

      <div className="space-y-6">
        {/* 見積金額・許容原価 */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50">
          <div>
            <p className="text-sm text-gray-500">見積金額</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(estimate_amount)}</p>
            {additionalWorksTotal > 0 && (
              <p className="text-xs text-green-600">
                （追加工事 +{formatCurrency(additionalWorksTotal)} 含む）
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">許容原価（利益率{targetProfitRate}%確保）</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(allowable_cost)}</p>
          </div>
        </div>

        {/* 予算配分 */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-blue-50">
          <div>
            <p className="text-sm text-blue-700">材料費予算</p>
            <p className="text-lg font-semibold text-blue-900">{formatCurrency(material_budget)}</p>
          </div>
          <div>
            <p className="text-sm text-blue-700">人件費予算</p>
            <p className="text-lg font-semibold text-blue-900">{formatCurrency(labor_budget)}</p>
          </div>
          <div>
            <p className="text-sm text-blue-700">許容人工数</p>
            <p className="text-lg font-semibold text-blue-900">{allowable_labor_count}人工</p>
            <p className="text-xs text-blue-600">@{laborUnitPrice.toLocaleString()}円</p>
          </div>
        </div>

        {/* 消化状況 */}
        <div className="space-y-4">
          {/* 材料費 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">材料費</span>
              <span className={`text-sm font-medium ${isMaterialOver ? 'text-red-600' : isMaterialWarning ? 'text-yellow-600' : 'text-gray-600'}`}>
                {formatCurrency(material_spent)} / {formatCurrency(material_budget)}（{material_percentage}%消化）
              </span>
            </div>
            <ProgressBar percentage={material_percentage} color={getMaterialColor()} />
            <div className="flex items-center justify-between text-xs">
              <span className={remaining_material < 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                {remaining_material >= 0 ? `残り ${formatCurrency(remaining_material)}` : `${formatCurrency(Math.abs(remaining_material))} 超過`}
              </span>
              {isMaterialWarning && (
                <span className="flex items-center text-yellow-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {isMaterialOver ? '予算超過' : '予算残り少'}
                </span>
              )}
            </div>
          </div>

          {/* 人工 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">人工</span>
              <span className={`text-sm font-medium ${isLaborOver ? 'text-red-600' : isLaborWarning ? 'text-yellow-600' : 'text-gray-600'}`}>
                {labor_spent}人工 / {allowable_labor_count}人工（{labor_percentage}%消化）
              </span>
            </div>
            <ProgressBar percentage={labor_percentage} color={getLaborColor()} />
            <div className="flex items-center justify-between text-xs">
              <span className={remaining_labor < 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                {remaining_labor >= 0 ? `残り ${remaining_labor}人工` : `${Math.abs(remaining_labor)}人工 超過`}
              </span>
              {isLaborWarning && (
                <span className="flex items-center text-yellow-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {isLaborOver ? '人工超過' : '残り人工少'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 現在の利益予測 */}
        <div className={`p-4 rounded-lg ${isProfitOk ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">現在の利益予測</span>
            <div className="flex items-center space-x-1">
              {isProfitOk ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-lg font-bold ${isProfitOk ? 'text-green-700' : 'text-red-700'}`}>
                {projected_profit_rate}%
              </span>
            </div>
          </div>
          <p className={`text-sm ${isProfitOk ? 'text-green-700' : 'text-red-700'}`}>
            {isProfitOk
              ? `目標利益率${targetProfitRate}%を達成`
              : `目標利益率${targetProfitRate}%を下回る見込み`
            }
          </p>
        </div>
      </div>
    </div>
  );
}
