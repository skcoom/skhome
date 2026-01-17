'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Users,
  AlertTriangle,
  Check,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LaborRecord, Project } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatCurrency(value: number): string {
  if (value >= 10000) {
    return `${Math.round(value / 10000)}万円`;
  }
  return `${value.toLocaleString()}円`;
}

export default function ProjectLaborPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [project, setProject] = useState<Project | null>(null);
  const [records, setRecords] = useState<LaborRecord[]>([]);
  const [totalLaborCount, setTotalLaborCount] = useState(0);
  const [allowableLaborCount, setAllowableLaborCount] = useState(0);
  const [laborBudget, setLaborBudget] = useState(0);
  const [laborUnitPrice, setLaborUnitPrice] = useState(25000);
  const [monthlyTotals, setMonthlyTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LaborRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    work_date: new Date().toISOString().split('T')[0],
    worker_count: '',
    description: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // プロジェクト情報を取得
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      setProject(projectData);

      // 人工記録を取得
      const response = await fetch(`/api/projects/${projectId}/labor`);
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records || []);
        setTotalLaborCount(data.totalLaborCount || 0);
        setAllowableLaborCount(data.allowableLaborCount || 0);
        setLaborBudget(data.laborBudget || 0);
        setLaborUnitPrice(data.laborUnitPrice || 25000);
        setMonthlyTotals(data.monthlyTotals || {});
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const workerCount = parseFloat(formData.worker_count);
    if (!formData.work_date || isNaN(workerCount) || workerCount <= 0) {
      alert('日付と人工数を正しく入力してください');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingRecord
        ? `/api/projects/${projectId}/labor/${editingRecord.id}`
        : `/api/projects/${projectId}/labor`;
      const method = editingRecord ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_date: formData.work_date,
          worker_count: workerCount,
          description: formData.description || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存に失敗しました');
      }

      await fetchData();
      resetForm();
    } catch (error) {
      console.error('Save error:', error);
      alert(error instanceof Error ? error.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (record: LaborRecord) => {
    setEditingRecord(record);
    setFormData({
      work_date: record.work_date,
      worker_count: record.worker_count.toString(),
      description: record.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (record: LaborRecord) => {
    if (!confirm('この人工記録を削除しますか？')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/labor/${record.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '削除に失敗しました');
      }

      await fetchData();
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : '削除に失敗しました');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingRecord(null);
    setFormData({
      work_date: new Date().toISOString().split('T')[0],
      worker_count: '',
      description: '',
    });
  };

  const remainingLaborCount = allowableLaborCount - totalLaborCount;
  const isOverLimit = remainingLaborCount < 0;
  const isNearLimit = !isOverLimit && remainingLaborCount < allowableLaborCount * 0.2;
  const consumptionRate = allowableLaborCount > 0 ? Math.round((totalLaborCount / allowableLaborCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <Link
            href={`/admin/projects/${projectId}`}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">人工管理</h1>
            <p className="text-gray-500 mt-1">{project?.name}</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          人工を記録
        </Button>
      </div>

      {/* 人工サマリー */}
      <div className={`rounded-lg p-6 ${isOverLimit ? 'bg-red-50' : isNearLimit ? 'bg-yellow-50' : 'bg-green-50'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600">人件費予算</p>
            <p className="text-xl font-bold">{formatCurrency(laborBudget)}</p>
            <p className="text-xs text-gray-500">@{laborUnitPrice.toLocaleString()}円/人工</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">許容人工数</p>
            <p className="text-xl font-bold">{allowableLaborCount}人工</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">消化人工数</p>
            <p className="text-xl font-bold">{totalLaborCount}人工</p>
            <p className="text-xs text-gray-500">{consumptionRate}%消化</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">残り人工</p>
            <p className={`text-xl font-bold ${isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-green-600'}`}>
              {remainingLaborCount >= 0 ? `${remainingLaborCount}人工` : `${Math.abs(remainingLaborCount)}人工超過`}
            </p>
            {(isOverLimit || isNearLimit) && (
              <div className="flex items-center space-x-1 mt-1">
                <AlertTriangle className={`h-4 w-4 ${isOverLimit ? 'text-red-500' : 'text-yellow-500'}`} />
                <span className={`text-xs ${isOverLimit ? 'text-red-700' : 'text-yellow-700'}`}>
                  {isOverLimit ? '人工超過' : '残り少'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* プログレスバー */}
        <div className="mt-4">
          <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, consumptionRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 月別集計 */}
      {Object.keys(monthlyTotals).length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">月別集計</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(monthlyTotals)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([month, count]) => (
                <div key={month} className="p-3 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-500">{month}</p>
                  <p className="text-lg font-bold">{count}人工</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 人工記録一覧 */}
      <div className="rounded-lg bg-white shadow overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">人工記録一覧</h3>
        </div>
        <div className="divide-y">
          {records.map((record) => (
            <div key={record.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center space-x-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{formatDate(record.work_date)}</p>
                  {record.description && (
                    <p className="text-sm text-gray-500">{record.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{record.worker_count}人工</p>
                  <p className="text-xs text-gray-500">{formatCurrency(record.worker_count * laborUnitPrice)}</p>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(record)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(record)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {records.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>人工記録がありません</p>
              <p className="text-sm">「人工を記録」から登録してください</p>
            </div>
          )}
        </div>
      </div>

      {/* 人工記録フォームモーダル */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingRecord ? '人工記録を編集' : '人工を記録'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  作業日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.work_date}
                  onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  人工数 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={formData.worker_count}
                  onChange={(e) => setFormData({ ...formData, worker_count: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="例: 2"
                />
                <p className="text-xs text-gray-500 mt-1">0.5人工単位で入力可能</p>
              </div>

              {/* 警告表示 */}
              {formData.worker_count && (
                (() => {
                  const newWorkerCount = parseFloat(formData.worker_count) || 0;
                  const oldWorkerCount = editingRecord ? editingRecord.worker_count : 0;
                  const newTotal = totalLaborCount - oldWorkerCount + newWorkerCount;
                  const newRemaining = allowableLaborCount - newTotal;

                  if (newRemaining < 0) {
                    return (
                      <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg text-red-700">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="text-sm">
                          この記録を登録すると許容人工を {Math.abs(newRemaining)}人工 超過します
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  作業内容（任意）
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="例: 解体作業、配管工事など"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {editingRecord ? '更新' : '登録'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
