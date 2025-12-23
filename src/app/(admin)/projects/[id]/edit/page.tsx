'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { Project } from '@/types/database';
import { DocumentAnalyzer } from '@/components/admin/DocumentAnalyzer';
import type { ExtractedProjectData } from '@/types/document-analysis';
import { PROJECT_TAGS } from '@/lib/constants';

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    address: '',
    tags: [] as string[],
    status: 'planning',
    start_date: '',
    end_date: '',
    description: '',
    is_public: false,
  });

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
          throw new Error('プロジェクトの取得に失敗しました');
        }
        const data: Project = await response.json();
        setFormData({
          name: data.name || '',
          client_name: data.client_name || '',
          address: data.address || '',
          tags: data.tags || [],
          status: data.status || 'planning',
          start_date: data.start_date || '',
          end_date: data.end_date || '',
          description: data.description || '',
          is_public: data.is_public || false,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : '読み込みに失敗しました');
      } finally {
        setIsFetching(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleTagToggle = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleApplyExtractedData = (data: Partial<ExtractedProjectData>) => {
    setFormData((prev) => ({
      ...prev,
      name: data.name ?? prev.name,
      client_name: data.client_name ?? prev.client_name,
      address: data.address ?? prev.address,
      tags: data.tags ?? prev.tags,
      status: data.status ?? prev.status,
      start_date: data.start_date ?? prev.start_date,
      end_date: data.end_date ?? prev.end_date,
      description: data.description ?? prev.description,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          client_name: formData.client_name || null,
          address: formData.address || null,
          tags: formData.tags.length > 0 ? formData.tags : ['住宅'],
          status: formData.status,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          description: formData.description || null,
          is_public: formData.is_public,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '現場の更新に失敗しました');
        return;
      }

      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch {
      setError('現場の更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || '現場の削除に失敗しました');
        return;
      }

      router.push('/projects');
      router.refresh();
    } catch {
      setError('現場の削除に失敗しました');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/projects/${projectId}`}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">現場を編集</h1>
            <p className="mt-1 text-sm text-gray-500">
              施工現場の情報を更新します
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowDeleteConfirm(true)}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          削除
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <DocumentAnalyzer onApply={handleApplyExtractedData} />

        <div className="rounded-lg bg-white p-6 shadow">
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                id="name"
                name="name"
                label="工事名 *"
                value={formData.name}
                onChange={handleChange}
                placeholder="例: 山田邸 キッチンリフォーム工事"
                required
              />
            </div>

            <Input
              id="client_name"
              name="client_name"
              label="施主名"
              value={formData.client_name}
              onChange={handleChange}
              placeholder="例: 山田太郎"
            />

            <Input
              id="address"
              name="address"
              label="施工場所"
              value={formData.address}
              onChange={handleChange}
              placeholder="例: 東京都世田谷区○○町1-2-3"
            />

            <div className="md:col-span-2 space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                タグ *
              </label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      formData.tags.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {formData.tags.length === 0 && (
                <p className="text-xs text-gray-500">少なくとも1つのタグを選択してください</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                ステータス *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="planning">計画中</option>
                <option value="in_progress">施工中</option>
                <option value="completed">完了</option>
              </select>
            </div>

            <Input
              id="start_date"
              name="start_date"
              type="date"
              label="開始日"
              value={formData.start_date}
              onChange={handleChange}
            />

            <Input
              id="end_date"
              name="end_date"
              type="date"
              label="完了日"
              value={formData.end_date}
              onChange={handleChange}
            />

            <div className="md:col-span-2 space-y-1">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                工事概要
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="工事の概要や特記事項を入力してください"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="is_public"
                  checked={formData.is_public}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  公開ページに掲載する
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                チェックを入れると、施工実績ページに表示されます
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Link href={`/projects/${projectId}`}>
            <Button type="button" variant="outline">
              キャンセル
            </Button>
          </Link>
          <Button type="submit" isLoading={isLoading}>
            更新する
          </Button>
        </div>
      </form>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-lg font-medium text-gray-900">現場を削除</h3>
            <p className="mt-2 text-sm text-gray-500">
              「{formData.name}」を削除しますか？この操作は取り消せません。
              関連する写真・動画も削除されます。
            </p>
            <div className="mt-6 flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleDelete}
                isLoading={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                削除する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
