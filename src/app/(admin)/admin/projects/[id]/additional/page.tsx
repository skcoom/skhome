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
  Wrench,
  Check,
  X,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProjectAdditionalWork, AdditionalWorkTemplate, Project } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

function formatCurrency(value: number): string {
  if (value >= 10000) {
    return `${Math.round(value / 10000)}万円`;
  }
  return `${value.toLocaleString()}円`;
}

const statusConfig = {
  proposed: { label: '提案中', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  accepted: { label: '受注', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  declined: { label: '辞退', color: 'bg-gray-100 text-gray-500', icon: XCircle },
};

export default function ProjectAdditionalWorksPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [project, setProject] = useState<Project | null>(null);
  const [works, setWorks] = useState<ProjectAdditionalWork[]>([]);
  const [templates, setTemplates] = useState<AdditionalWorkTemplate[]>([]);
  const [acceptedTotal, setAcceptedTotal] = useState(0);
  const [proposedTotal, setProposedTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingWork, setEditingWork] = useState<ProjectAdditionalWork | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    status: 'proposed' as 'proposed' | 'accepted' | 'declined',
    notes: '',
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

      // 追加工事マスタを取得
      const templatesRes = await fetch('/api/additional-works');
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData.templates.filter((t: AdditionalWorkTemplate) => t.is_active));
      }

      // 現場の追加工事を取得
      const worksRes = await fetch(`/api/projects/${projectId}/additional-works`);
      if (worksRes.ok) {
        const worksData = await worksRes.json();
        setWorks(worksData.works || []);
        setAcceptedTotal(worksData.acceptedTotal || 0);
        setProposedTotal(worksData.proposedTotal || 0);
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

  const handleAddFromTemplate = async (template: AdditionalWorkTemplate) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/additional-works`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: template.id,
          name: template.name,
          price: template.default_price,
          status: 'proposed',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '追加に失敗しました');
      }

      await fetchData();
      setShowSelector(false);
    } catch (error) {
      console.error('Add error:', error);
      alert(error instanceof Error ? error.message : '追加に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (work: ProjectAdditionalWork, newStatus: 'proposed' | 'accepted' | 'declined') => {
    try {
      const response = await fetch(`/api/projects/${projectId}/additional-works/${work.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '更新に失敗しました');
      }

      await fetchData();
    } catch (error) {
      console.error('Status change error:', error);
      alert(error instanceof Error ? error.message : '更新に失敗しました');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      alert('工事名と金額を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingWork
        ? `/api/projects/${projectId}/additional-works/${editingWork.id}`
        : `/api/projects/${projectId}/additional-works`;
      const method = editingWork ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseInt(formData.price),
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

  const handleEdit = (work: ProjectAdditionalWork) => {
    setEditingWork(work);
    setFormData({
      name: work.name,
      price: work.price.toString(),
      status: work.status,
      notes: work.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (work: ProjectAdditionalWork) => {
    if (!confirm(`「${work.name}」を削除しますか？`)) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/additional-works/${work.id}`, {
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
    setEditingWork(null);
    setFormData({
      name: '',
      price: '',
      status: 'proposed',
      notes: '',
    });
  };

  // 既に追加済みのテンプレートIDリスト
  const addedTemplateIds = works.map(w => w.template_id).filter(Boolean);

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
            <h1 className="text-2xl font-bold text-gray-900">追加工事提案</h1>
            <p className="text-gray-500 mt-1">{project?.name}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowSelector(true)}>
            <Plus className="mr-2 h-4 w-4" />
            マスタから選択
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            手動で追加
          </Button>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-sm text-yellow-700">提案中</p>
          <p className="text-2xl font-bold text-yellow-900">{formatCurrency(proposedTotal)}</p>
          <p className="text-xs text-yellow-600">{works.filter(w => w.status === 'proposed').length}件</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm text-green-700">受注</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(acceptedTotal)}</p>
          <p className="text-xs text-green-600">{works.filter(w => w.status === 'accepted').length}件</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">辞退</p>
          <p className="text-2xl font-bold text-gray-700">
            {formatCurrency(works.filter(w => w.status === 'declined').reduce((sum, w) => sum + w.price, 0))}
          </p>
          <p className="text-xs text-gray-500">{works.filter(w => w.status === 'declined').length}件</p>
        </div>
      </div>

      {/* 追加工事一覧 */}
      <div className="rounded-lg bg-white shadow overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">追加工事一覧</h3>
        </div>
        <div className="divide-y">
          {works.map((work) => {
            const StatusIcon = statusConfig[work.status].icon;
            return (
              <div key={work.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${statusConfig[work.status].color}`}>
                    <StatusIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{work.name}</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(work.price)}</p>
                    {work.notes && (
                      <p className="text-sm text-gray-500 mt-1">{work.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {/* ステータス変更ボタン */}
                  <div className="flex space-x-1">
                    {work.status !== 'accepted' && (
                      <button
                        onClick={() => handleStatusChange(work, 'accepted')}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                        title="受注に変更"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    {work.status !== 'declined' && (
                      <button
                        onClick={() => handleStatusChange(work, 'declined')}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        title="辞退に変更"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {work.status !== 'proposed' && (
                      <button
                        onClick={() => handleStatusChange(work, 'proposed')}
                        className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                        title="提案中に戻す"
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleEdit(work)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(work)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {works.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>追加工事がありません</p>
              <p className="text-sm">「マスタから選択」または「手動で追加」から登録してください</p>
            </div>
          )}
        </div>
      </div>

      {/* テンプレート選択モーダル */}
      {showSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">追加工事を選択</h3>

            <div className="space-y-4">
              {templates.map((template) => {
                const isAdded = addedTemplateIds.includes(template.id);
                return (
                  <div
                    key={template.id}
                    className={`rounded-lg border p-4 ${isAdded ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{template.name}</p>
                        <p className="text-sm text-gray-500">{template.category}</p>
                        <p className="text-lg font-bold text-blue-600">{formatCurrency(template.default_price)}</p>
                        {template.description && (
                          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                        )}
                      </div>
                      <Button
                        onClick={() => handleAddFromTemplate(template)}
                        disabled={isAdded || isSaving}
                        variant={isAdded ? 'outline' : 'default'}
                      >
                        {isAdded ? '追加済み' : '追加'}
                      </Button>
                    </div>
                  </div>
                );
              })}

              {templates.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  追加工事マスタが登録されていません
                </p>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => setShowSelector(false)}>
                閉じる
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 手動追加・編集フォームモーダル */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingWork ? '追加工事を編集' : '追加工事を追加'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  工事名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="例: 床暖房設置"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  金額（円） <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="例: 400000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'proposed' | 'accepted' | 'declined' })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="proposed">提案中</option>
                  <option value="accepted">受注</option>
                  <option value="declined">辞退</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メモ
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="備考など..."
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
                    editingWork ? '更新' : '追加'
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
