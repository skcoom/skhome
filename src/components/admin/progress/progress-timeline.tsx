'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProjectProgressExtended, ProgressPhase } from '@/types/database';

interface ProgressTimelineProps {
  projectId: string;
}

const phaseLabels: Record<ProgressPhase, string> = {
  '着工準備': '着工準備',
  '解体': '解体',
  '下地工事': '下地工事',
  '設備工事': '設備工事',
  '仕上げ工事': '仕上げ工事',
  '検査・引渡し': '検査・引渡し',
  'その他': 'その他',
};

const phaseColors: Record<ProgressPhase, string> = {
  '着工準備': 'bg-gray-500',
  '解体': 'bg-red-500',
  '下地工事': 'bg-orange-500',
  '設備工事': 'bg-blue-500',
  '仕上げ工事': 'bg-green-500',
  '検査・引渡し': 'bg-purple-500',
  'その他': 'bg-gray-400',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function ProgressTimeline({ projectId }: ProgressTimelineProps) {
  const [progressList, setProgressList] = useState<ProjectProgressExtended[]>([]);
  const [currentProgressPercentage, setCurrentProgressPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProgress, setEditingProgress] = useState<ProjectProgressExtended | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    phase: '' as ProgressPhase | '',
    progress_percentage: '',
  });

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/progress`);
      if (!response.ok) throw new Error('取得に失敗しました');
      const data = await response.json();
      setProgressList(data.progress || []);
      setCurrentProgressPercentage(data.currentProgressPercentage || 0);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.description.trim()) {
      alert('日付と説明を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingProgress
        ? `/api/projects/${projectId}/progress/${editingProgress.id}`
        : `/api/projects/${projectId}/progress`;
      const method = editingProgress ? 'PUT' : 'POST';

      const body: Record<string, unknown> = {
        date: formData.date,
        description: formData.description,
      };

      if (formData.phase) body.phase = formData.phase;
      if (formData.progress_percentage) body.progress_percentage = parseInt(formData.progress_percentage);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存に失敗しました');
      }

      await fetchProgress();
      resetForm();
    } catch (error) {
      console.error('Save error:', error);
      alert(error instanceof Error ? error.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (progress: ProjectProgressExtended) => {
    setEditingProgress(progress);
    setFormData({
      date: progress.date,
      description: progress.description,
      phase: progress.phase || '',
      progress_percentage: progress.progress_percentage?.toString() || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (progress: ProjectProgressExtended) => {
    if (!confirm('この進捗を削除しますか？')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/progress/${progress.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '削除に失敗しました');
      }

      await fetchProgress();
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : '削除に失敗しました');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingProgress(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      phase: '',
      progress_percentage: '',
    });
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 進捗率サマリー */}
      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
        <div>
          <p className="text-sm text-blue-700">現在の進捗率</p>
          <p className="text-2xl font-bold text-blue-900">{currentProgressPercentage}%</p>
        </div>
        <div className="flex-1 mx-6">
          <div className="h-3 w-full rounded-full bg-blue-200 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${currentProgressPercentage}%` }}
            />
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          進捗を追加
        </Button>
      </div>

      {/* タイムライン */}
      <div className="space-y-4">
        {progressList.map((progress, index) => (
          <div key={progress.id} className="relative flex gap-4">
            {/* タイムラインのライン */}
            {index < progressList.length - 1 && (
              <div className="absolute left-5 top-10 h-full w-0.5 bg-gray-200" />
            )}

            {/* アイコン */}
            <div className={`relative flex h-10 w-10 items-center justify-center rounded-full ${progress.phase ? phaseColors[progress.phase] : 'bg-gray-400'} text-white`}>
              {progress.progress_percentage === 100 ? (
                <CheckCircle className="h-5 w-5" />
              ) : progress.progress_percentage ? (
                <span className="text-xs font-bold">{progress.progress_percentage}%</span>
              ) : (
                <Clock className="h-5 w-5" />
              )}
            </div>

            {/* コンテンツ */}
            <div className="flex-1 rounded-lg bg-white p-4 shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-500">{formatDate(progress.date)}</p>
                    {progress.phase && (
                      <span className={`rounded-full px-2 py-0.5 text-xs text-white ${phaseColors[progress.phase]}`}>
                        {phaseLabels[progress.phase]}
                      </span>
                    )}
                    {progress.progress_percentage !== undefined && progress.progress_percentage !== null && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                        {progress.progress_percentage}%
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-gray-900 whitespace-pre-wrap">{progress.description}</p>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(progress)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(progress)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {progressList.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>進捗記録がありません</p>
            <p className="text-sm">「進捗を追加」から登録してください</p>
          </div>
        )}
      </div>

      {/* フォームモーダル */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingProgress ? '進捗を編集' : '進捗を追加'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    日付 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    進捗率（%）
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress_percentage}
                    onChange={(e) => setFormData({ ...formData, progress_percentage: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="0-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  工程フェーズ
                </label>
                <select
                  value={formData.phase}
                  onChange={(e) => setFormData({ ...formData, phase: e.target.value as ProgressPhase | '' })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">選択してください</option>
                  {Object.entries(phaseLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="進捗内容を記入..."
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
                    editingProgress ? '更新' : '追加'
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
