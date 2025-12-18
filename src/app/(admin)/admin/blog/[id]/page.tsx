'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BlogPost } from '@/types/database';

const categoryLabels: Record<string, string> = {
  news: 'ニュース',
  column: 'コラム',
  case_study: '施工事例',
};

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [originalSlug, setOriginalSlug] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: 'news',
    status: 'draft' as 'draft' | 'published',
    featured_image: '',
    ai_generated: false,
  });

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/blog/${postId}`);
        if (!response.ok) {
          throw new Error('記事の取得に失敗しました');
        }
        const data: BlogPost = await response.json();
        setFormData({
          title: data.title || '',
          slug: data.slug || '',
          excerpt: data.excerpt || '',
          content: data.content || '',
          category: data.category || 'news',
          status: data.status || 'draft',
          featured_image: data.featured_image || '',
          ai_generated: data.ai_generated || false,
        });
        setOriginalSlug(data.slug);
      } catch (err) {
        setError(err instanceof Error ? err.message : '読み込みに失敗しました');
      } finally {
        setIsFetching(false);
      }
    };

    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const handleSave = async (publish = false) => {
    if (!formData.title || !formData.content) {
      setError('タイトルと本文は必須です');
      return;
    }

    if (!formData.slug) {
      setError('URLスラッグは必須です');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/blog/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug,
          content: formData.content,
          excerpt: formData.excerpt || null,
          featured_image: formData.featured_image || null,
          category: formData.category,
          status: publish ? 'published' : formData.status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '保存に失敗しました');
        return;
      }

      router.push('/admin/blog');
      router.refresh();
    } catch {
      setError('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/blog/${postId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || '削除に失敗しました');
        return;
      }

      router.push('/admin/blog');
      router.refresh();
    } catch {
      setError('削除に失敗しました');
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
        <div className="flex items-center gap-4">
          <Link
            href="/admin/blog"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">記事を編集</h1>
            <p className="mt-1 text-sm text-gray-500">
              ブログ記事の内容を編集します
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            削除
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            保存
          </Button>
          {formData.status === 'draft' && (
            <Button onClick={() => handleSave(true)} disabled={isSaving}>
              公開する
            </Button>
          )}
          {formData.status === 'published' && (
            <Link
              href={`/blog/${originalSlug}`}
              target="_blank"
              className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              記事を表示
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <Input
            id="title"
            label="タイトル"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="記事のタイトルを入力"
            required
          />

          {/* Excerpt */}
          <div>
            <label
              htmlFor="excerpt"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              抜粋
            </label>
            <textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
              }
              rows={2}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="記事の要約（100文字程度）"
            />
          </div>

          {/* Content */}
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              本文 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, content: e.target.value }))
              }
              rows={20}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
              placeholder="Markdown形式で記事を入力..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Markdown形式で入力できます
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">ステータス</h3>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  status: e.target.value as 'draft' | 'published',
                }))
              }
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="draft">下書き</option>
              <option value="published">公開</option>
            </select>
            {formData.ai_generated && (
              <p className="mt-2 text-xs text-purple-600">
                この記事はAIで生成されました
              </p>
            )}
          </div>

          {/* Category */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">カテゴリ</h3>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, category: e.target.value }))
              }
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Slug */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">URL スラッグ</h3>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: e.target.value }))
              }
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              placeholder="url-slug"
            />
            <p className="mt-2 text-xs text-gray-500">
              /blog/{formData.slug || 'url-slug'}
            </p>
          </div>

          {/* Featured Image */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              アイキャッチ画像
            </h3>
            {formData.featured_image ? (
              <div className="space-y-2">
                <img
                  src={formData.featured_image}
                  alt="アイキャッチ"
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, featured_image: '' }))
                  }
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  画像を削除
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-500">
                  ドラッグ&ドロップ
                  <br />
                  または
                </p>
                <button className="mt-2 text-sm text-blue-600 hover:text-blue-700">
                  ファイルを選択
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-lg font-medium text-gray-900">記事を削除</h3>
            <p className="mt-2 text-sm text-gray-500">
              「{formData.title}」を削除しますか？この操作は取り消せません。
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
