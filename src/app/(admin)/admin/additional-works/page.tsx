'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Loader2, Wrench, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdditionalWorkTemplate } from '@/types/database';

function formatCurrency(value: number): string {
  if (value >= 10000) {
    return `${Math.round(value / 10000)}万円`;
  }
  return `${value.toLocaleString()}円`;
}

const categoryColors: Record<string, string> = {
  'キッチン': 'bg-orange-100 text-orange-800',
  '浴室': 'bg-blue-100 text-blue-800',
  'トイレ': 'bg-purple-100 text-purple-800',
  'リビング': 'bg-green-100 text-green-800',
  '全体': 'bg-gray-100 text-gray-800',
  '電気': 'bg-yellow-100 text-yellow-800',
};

export default function AdditionalWorksPage() {
  const [templates, setTemplates] = useState<AdditionalWorkTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AdditionalWorkTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    default_price: '',
    description: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const categories = [...new Set(templates.map(t => t.category))];

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/additional-works');
      if (!response.ok) throw new Error('取得に失敗しました');
      const data = await response.json();
      setTemplates(data.templates.filter((t: AdditionalWorkTemplate) => t.is_active));
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category.trim() || !formData.default_price) {
      alert('工事名、カテゴリ、標準価格を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingTemplate
        ? `/api/additional-works/${editingTemplate.id}`
        : '/api/additional-works';
      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          default_price: parseInt(formData.default_price),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存に失敗しました');
      }

      await fetchTemplates();
      resetForm();
    } catch (error) {
      console.error('Save error:', error);
      alert(error instanceof Error ? error.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (template: AdditionalWorkTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      default_price: template.default_price.toString(),
      description: template.description || '',
      notes: template.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (template: AdditionalWorkTemplate) => {
    if (!confirm(`「${template.name}」を削除しますか？`)) return;

    try {
      const response = await fetch(`/api/additional-works/${template.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '削除に失敗しました');
      }

      await fetchTemplates();
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : '削除に失敗しました');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setFormData({
      name: '',
      category: '',
      default_price: '',
      description: '',
      notes: '',
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // カテゴリ別にグループ化
  const groupedTemplates: Record<string, AdditionalWorkTemplate[]> = {};
  templates.forEach(t => {
    if (!groupedTemplates[t.category]) {
      groupedTemplates[t.category] = [];
    }
    groupedTemplates[t.category].push(t);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">追加工事マスタ</h1>
          <p className="text-gray-500 mt-1">顧客に提案する追加工事のテンプレートを管理します</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          追加工事を登録
        </Button>
      </div>

      {/* カテゴリ別一覧 */}
      {Object.entries(groupedTemplates).map(([category, items]) => (
        <div key={category} className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center space-x-2 mb-4">
            <Tag className={`h-5 w-5 ${categoryColors[category]?.split(' ')[1] || 'text-gray-600'}`} />
            <h2 className="text-lg font-medium text-gray-900">{category}</h2>
            <span className="text-sm text-gray-500">({items.length}件)</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((template) => (
              <div
                key={template.id}
                className="rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(template.default_price)}</p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {template.description && (
                  <p className="text-sm text-gray-600 mt-2">{template.description}</p>
                )}
                {template.notes && (
                  <p className="text-xs text-gray-400 mt-2 border-t pt-2">{template.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {templates.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
          <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>追加工事マスタがありません</p>
          <p className="text-sm">「追加工事を登録」から登録してください</p>
        </div>
      )}

      {/* フォームモーダル */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingTemplate ? '追加工事を編集' : '追加工事を登録'}
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
                  placeholder="例: 食洗機設置"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="categories"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="例: キッチン"
                />
                <datalist id="categories">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  標準価格（円） <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.default_price}
                  onChange={(e) => setFormData({ ...formData, default_price: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="例: 150000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  顧客向け説明文
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="例: キッチンリフォームと同時施工がお得"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  内部メモ
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="社内向けメモ..."
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
                    editingTemplate ? '更新' : '登録'
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
