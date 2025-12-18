import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Plus, FolderKanban, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

const statusLabels = {
  planning: { label: '計画中', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: '施工中', color: 'bg-blue-100 text-blue-800' },
  completed: { label: '完了', color: 'bg-green-100 text-green-800' },
};

const categoryLabels = {
  apartment: 'マンション',
  remodeling: 'リフォーム',
  new_construction: '新築',
  house: '住宅',
};

export default async function ProjectsPage() {
  const supabase = await createClient();

  // プロジェクト一覧を取得（Supabase設定後に有効化）
  // const { data: projects, error } = await supabase
  //   .from('projects')
  //   .select('*')
  //   .order('created_at', { ascending: false });

  // デモ用のダミーデータ
  const projects = [
    {
      id: '1',
      name: '大橋邸 リフォーム工事',
      client_name: '大橋様',
      address: '東京都世田谷区',
      category: 'remodeling' as const,
      status: 'completed' as const,
      start_date: '2022-04-01',
      end_date: '2022-04-30',
      is_public: true,
    },
    {
      id: '2',
      name: '東京医療商事 事務所内装',
      client_name: '東京医療商事',
      address: '東京都中央区',
      category: 'remodeling' as const,
      status: 'in_progress' as const,
      start_date: '2024-01-15',
      end_date: null,
      is_public: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">現場管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            施工現場の登録・管理を行います
          </p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規現場を登録
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">すべてのステータス</option>
          <option value="planning">計画中</option>
          <option value="in_progress">施工中</option>
          <option value="completed">完了</option>
        </select>
        <select className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">すべてのカテゴリ</option>
          <option value="apartment">マンション</option>
          <option value="remodeling">リフォーム</option>
          <option value="new_construction">新築</option>
          <option value="house">住宅</option>
        </select>
      </div>

      {/* Project list */}
      <div className="grid gap-4">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <FolderKanban className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {project.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {project.client_name && `${project.client_name} 様`}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    {project.address && (
                      <span className="flex items-center">
                        <MapPin className="mr-1 h-4 w-4" />
                        {project.address}
                      </span>
                    )}
                    {project.start_date && (
                      <span className="flex items-center">
                        <Calendar className="mr-1 h-4 w-4" />
                        {project.start_date}
                        {project.end_date && ` 〜 ${project.end_date}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                  {categoryLabels[project.category]}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusLabels[project.status].color}`}>
                  {statusLabels[project.status].label}
                </span>
                {project.is_public && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                    公開中
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <FolderKanban className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            現場がありません
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            新しい現場を登録して管理を始めましょう
          </p>
          <div className="mt-6">
            <Link href="/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                新規現場を登録
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
