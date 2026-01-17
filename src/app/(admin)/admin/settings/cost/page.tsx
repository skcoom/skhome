'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Settings, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CostSettingsPage() {
  const [laborUnitPrice, setLaborUnitPrice] = useState('25000');
  const [targetProfitRate, setTargetProfitRate] = useState('20');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/cost');
      if (!response.ok) throw new Error('取得に失敗しました');
      const data = await response.json();
      setLaborUnitPrice(data.laborUnitPrice?.toString() || '25000');
      setTargetProfitRate(data.targetProfitRate?.toString() || '20');
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const price = parseInt(laborUnitPrice);
    const rate = parseInt(targetProfitRate);

    if (isNaN(price) || price < 1000 || price > 100000) {
      alert('人工単価は1,000円〜100,000円の範囲で入力してください');
      return;
    }

    if (isNaN(rate) || rate < 1 || rate > 50) {
      alert('目標利益率は1%〜50%の範囲で入力してください');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/cost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          laborUnitPrice: price,
          targetProfitRate: rate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存に失敗しました');
      }

      alert('設定を保存しました');
    } catch (error) {
      console.error('Save error:', error);
      alert(error instanceof Error ? error.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 計算例
  const exampleEstimate = 5000000; // 500万円
  const exampleMaterialBudget = 2500000; // 250万円
  const price = parseInt(laborUnitPrice) || 25000;
  const rate = parseInt(targetProfitRate) || 20;
  const allowableCost = Math.floor(exampleEstimate * (1 - rate / 100));
  const laborBudget = allowableCost - exampleMaterialBudget;
  const allowableLaborCount = Math.floor(laborBudget / price);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start space-x-4">
        <Link
          href="/admin/settings"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">コスト設定</h1>
          <p className="text-gray-500 mt-1">利益管理に使用する共通設定を行います</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 設定フォーム */}
        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center space-x-2 mb-6">
            <Settings className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-medium text-gray-900">システム設定</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="laborUnitPrice" className="block text-sm font-medium text-gray-700 mb-1">
                人工単価（円/人工）
              </label>
              <input
                id="laborUnitPrice"
                type="number"
                value={laborUnitPrice}
                onChange={(e) => setLaborUnitPrice(e.target.value)}
                min="1000"
                max="100000"
                step="1000"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <p className="mt-1 text-xs text-gray-500">
                人工数から人件費を計算する際に使用します（1,000円〜100,000円）
              </p>
            </div>

            <div>
              <label htmlFor="targetProfitRate" className="block text-sm font-medium text-gray-700 mb-1">
                目標利益率（%）
              </label>
              <input
                id="targetProfitRate"
                type="number"
                value={targetProfitRate}
                onChange={(e) => setTargetProfitRate(e.target.value)}
                min="1"
                max="50"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <p className="mt-1 text-xs text-gray-500">
                見積金額から許容原価を計算する際に使用します（1%〜50%）
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    設定を保存
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* 計算例 */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center space-x-2 mb-6">
            <Calculator className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-medium text-gray-900">計算例</h2>
          </div>

          <div className="p-4 rounded-lg bg-gray-50 space-y-4">
            <p className="text-sm text-gray-600">
              見積金額 <span className="font-bold">500万円</span>、材料費予算 <span className="font-bold">250万円</span> の場合
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">許容原価（利益率{rate}%確保）</span>
                <span className="font-medium">
                  500万円 × {100 - rate}% = <span className="text-blue-600">{Math.round(allowableCost / 10000)}万円</span>
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">人件費予算（自動計算）</span>
                <span className="font-medium">
                  {Math.round(allowableCost / 10000)}万円 - 250万円 = <span className="text-blue-600">{Math.round(laborBudget / 10000)}万円</span>
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">許容人工数（自動計算）</span>
                <span className="font-medium">
                  {Math.round(laborBudget / 10000)}万円 ÷ {(price / 10000).toFixed(1)}万円 = <span className="text-green-600">{allowableLaborCount}人工</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-blue-50">
            <p className="text-sm text-blue-800">
              この設定は新規に予算を設定する現場と、既存現場のコスト計算に使用されます。
              既存の現場で既に計算された数値は変更されません。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
