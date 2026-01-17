'use client';

import { useState, useEffect } from 'react';
import { Calculator, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProjectBudget } from '@/types/database';

interface BudgetFormProps {
  projectId: string;
  initialBudget: ProjectBudget | null;
  laborUnitPrice: number;
  targetProfitRate: number;
  onSave: (budget: Partial<ProjectBudget>) => Promise<void>;
}

function formatCurrency(value: number): string {
  if (value >= 10000) {
    return `${Math.round(value / 10000)}万円`;
  }
  return `${value.toLocaleString()}円`;
}

export function BudgetForm({
  initialBudget,
  laborUnitPrice,
  targetProfitRate,
  onSave,
}: BudgetFormProps) {
  const [estimateAmount, setEstimateAmount] = useState(initialBudget?.estimate_amount?.toString() || '');
  const [materialBudget, setMaterialBudget] = useState(initialBudget?.material_budget?.toString() || '');
  const [notes, setNotes] = useState(initialBudget?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  // 自動計算値
  const estimate = parseInt(estimateAmount) || 0;
  const material = parseInt(materialBudget) || 0;
  const allowableCost = Math.floor(estimate * (1 - targetProfitRate / 100));
  const laborBudget = allowableCost - material;
  const allowableLaborCount = laborBudget > 0 ? Math.floor(laborBudget / laborUnitPrice) : 0;

  const isValid = estimate > 0 && material > 0 && material <= allowableCost;
  const isOverBudget = material > allowableCost;

  useEffect(() => {
    if (initialBudget) {
      setEstimateAmount(initialBudget.estimate_amount?.toString() || '');
      setMaterialBudget(initialBudget.material_budget?.toString() || '');
      setNotes(initialBudget.notes || '');
    }
  }, [initialBudget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSaving(true);
    try {
      await onSave({
        estimate_amount: estimate,
        material_budget: material,
        labor_budget: laborBudget,
        notes: notes || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center space-x-2 mb-6">
        <Calculator className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">予算設定</h3>
      </div>

      <div className="space-y-6">
        {/* 見積金額 */}
        <div>
          <label htmlFor="estimate" className="block text-sm font-medium text-gray-700 mb-1">
            見積金額（円）
          </label>
          <input
            id="estimate"
            type="number"
            value={estimateAmount}
            onChange={(e) => setEstimateAmount(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-right"
            placeholder="5000000"
          />
          {estimate > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              = {formatCurrency(estimate)}
            </p>
          )}
        </div>

        {/* 許容原価（自動計算） */}
        {estimate > 0 && (
          <div className="p-4 rounded-lg bg-blue-50">
            <p className="text-sm text-blue-700">許容原価（利益率{targetProfitRate}%確保）</p>
            <p className="text-xl font-bold text-blue-900">{formatCurrency(allowableCost)}</p>
            <p className="text-xs text-blue-600 mt-1">
              {formatCurrency(estimate)} × {100 - targetProfitRate}% = {formatCurrency(allowableCost)}
            </p>
          </div>
        )}

        {/* 材料費予算 */}
        <div>
          <label htmlFor="material" className="block text-sm font-medium text-gray-700 mb-1">
            材料費予算（円）
          </label>
          <input
            id="material"
            type="number"
            value={materialBudget}
            onChange={(e) => setMaterialBudget(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-right ${
              isOverBudget ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="2500000"
          />
          {material > 0 && (
            <p className={`mt-1 text-sm ${isOverBudget ? 'text-red-600' : 'text-gray-500'}`}>
              = {formatCurrency(material)}
              {isOverBudget && ' （許容原価を超えています）'}
            </p>
          )}
        </div>

        {/* 自動計算結果 */}
        {estimate > 0 && material > 0 && !isOverBudget && (
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-green-50">
            <div>
              <p className="text-sm text-green-700">人件費予算（自動計算）</p>
              <p className="text-lg font-semibold text-green-900">{formatCurrency(laborBudget)}</p>
              <p className="text-xs text-green-600 mt-1">
                許容原価 - 材料費予算
              </p>
            </div>
            <div>
              <p className="text-sm text-green-700">許容人工数（自動計算）</p>
              <p className="text-lg font-semibold text-green-900">{allowableLaborCount}人工</p>
              <p className="text-xs text-green-600 mt-1">
                @{laborUnitPrice.toLocaleString()}円/人工
              </p>
            </div>
          </div>
        )}

        {/* メモ */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            メモ（任意）
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="予算に関するメモ..."
          />
        </div>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <Button type="submit" disabled={!isValid || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                予算を保存
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
