'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FeaturedImageUploader } from '@/components/admin/FeaturedImageUploader';

interface Project {
  id: string;
  name: string;
  category: string;
  client_name: string | null;
  address: string | null;
  description: string | null;
}

const categoryLabels: Record<string, string> = {
  news: 'ニュース',
  column: 'コラム',
  case_study: '施工事例',
};

function NewBlogPostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAIMode = searchParams.get('ai') === 'true';

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: 'news',
    status: 'draft' as 'draft' | 'published',
    featured_image: '',
  });

  // プロジェクト一覧を取得
  useEffect(() => {
    async function fetchProjects() {
      setIsLoadingProjects(true);
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      } finally {
        setIsLoadingProjects(false);
      }
    }
    if (isAIMode) {
      fetchProjects();
    }
  }, [isAIMode]);

  // AIモードの場合、カテゴリを施工事例に設定
  useEffect(() => {
    if (isAIMode) {
      setFormData((prev) => ({ ...prev, category: 'case_study' }));
    }
  }, [isAIMode]);

  // タイトルからスラッグを自動生成
  useEffect(() => {
    if (formData.title) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData((prev) => ({ ...prev, slug }));
    }
  }, [formData.title]);

  // AIでブログ記事を生成
  const handleAIGenerate = async () => {
    if (!selectedProjectId) {
      setError('施工事例を選択してください');
      return;
    }

    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: project.name,
          category: project.category,
          description: project.description || '',
          clientName: project.client_name || '',
          address: project.address || '',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'ブログ記事の生成に失敗しました');
      }

      const data = await response.json();

      setFormData((prev) => ({
        ...prev,
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        category: 'case_study',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  // 記事を保存
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
      const response = await fetch('/api/blog', {
        method: 'POST',
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
          status: publish ? 'published' : 'draft',
          ai_generated: isAIMode,
          project_id: selectedProjectId || null,
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
            <h1 className="text-2xl font-bold text-gray-900">
              {isAIMode ? 'AIでブログ記事を生成' : '新規記事作成'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isAIMode
                ? '施工事例からAIが記事を自動生成します'
                : '新しいブログ記事を作成します'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            下書き保存
          </Button>
          <Button onClick={() => handleSave(true)} disabled={isSaving}>
            公開する
          </Button>
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
          {/* AI Generation Section */}
          {isAIMode && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-purple-900 mb-4 flex items-center">
                <Sparkles className="mr-2 h-5 w-5" />
                AI記事生成
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    施工事例を選択
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    disabled={isLoadingProjects}
                  >
                    <option value="">
                      {isLoadingProjects ? '読み込み中...' : '選択してください'}
                    </option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  {projects.length === 0 && !isLoadingProjects && (
                    <p className="mt-2 text-sm text-gray-500">
                      施工事例が登録されていません。先に現場を登録してください。
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleAIGenerate}
                  disabled={isGenerating || !selectedProjectId}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      AIで記事を生成
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

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
          <FeaturedImageUploader
            currentImage={formData.featured_image}
            onImageChange={(url) =>
              setFormData((prev) => ({ ...prev, featured_image: url }))
            }
          />

          {/* Status Info */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">ステータス</h3>
            <p className="text-sm text-gray-600">
              {formData.status === 'draft' ? '下書き' : '公開中'}
            </p>
            {isAIMode && (
              <p className="mt-2 text-xs text-purple-600 flex items-center">
                <Sparkles className="mr-1 h-3 w-3" />
                AI生成記事
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );
}

export default function NewBlogPostPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewBlogPostContent />
    </Suspense>
  );
}
