'use client';

import Link from 'next/link';
import { Plus, Edit, Trash2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useState } from 'react';

// デモ用のブログ記事データ
const demoBlogPosts = [
  {
    id: '1',
    title: '浦安マンション キッチンリフォーム完了',
    slug: 'urayasu-kitchen-remodel',
    excerpt: '築15年のマンションのキッチンを最新のシステムキッチンにリフォームしました。',
    category: 'case_study',
    status: 'published',
    ai_generated: true,
    published_at: '2024-01-15',
    created_at: '2024-01-10',
  },
  {
    id: '2',
    title: 'リフォームで失敗しないためのポイント5選',
    slug: 'remodel-tips-5',
    excerpt: 'リフォームを検討中の方必見！失敗しないための重要なポイントをご紹介します。',
    category: 'column',
    status: 'published',
    ai_generated: false,
    published_at: '2024-01-08',
    created_at: '2024-01-05',
  },
  {
    id: '3',
    title: '年末年始の営業のお知らせ',
    slug: 'new-year-2024',
    excerpt: '2024年の年末年始の営業日程についてお知らせいたします。',
    category: 'news',
    status: 'draft',
    ai_generated: false,
    published_at: null,
    created_at: '2024-01-03',
  },
];

const categoryLabels: Record<string, string> = {
  news: 'ニュース',
  column: 'コラム',
  case_study: '施工事例',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: '下書き', color: 'bg-gray-100 text-gray-800' },
  published: { label: '公開中', color: 'bg-green-100 text-green-800' },
};

export default function BlogListPage() {
  const [posts] = useState(demoBlogPosts);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ブログ管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            ブログ記事の作成・編集・公開管理
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/blog/new?ai=true"
            className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 transition-colors"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            AIで記事を生成
          </Link>
          <Link
            href="/admin/blog/new"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            新規記事作成
          </Link>
        </div>
      </div>

      {/* Blog posts table */}
      <div className="overflow-hidden bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                タイトル
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                カテゴリ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                作成日
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                アクション
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {post.title}
                        </span>
                        {post.ai_generated && (
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                            <Sparkles className="mr-1 h-3 w-3" />
                            AI
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-md">
                        {post.excerpt}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {categoryLabels[post.category] || post.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statusLabels[post.status]?.color || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {post.status === 'published' ? (
                      <Eye className="mr-1 h-3 w-3" />
                    ) : (
                      <EyeOff className="mr-1 h-3 w-3" />
                    )}
                    {statusLabels[post.status]?.label || post.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(post.created_at).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/blog/${post.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => alert('削除機能は準備中です')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">まだ記事がありません</p>
            <Link
              href="/admin/blog/new"
              className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <Plus className="mr-1 h-4 w-4" />
              最初の記事を作成
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
