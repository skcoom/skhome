import Link from 'next/link';
import { Plus, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectList } from '@/components/admin/ProjectList';
import { createClient } from '@/lib/supabase/server';
import type { Project } from '@/types/database';

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Projects fetch error:', error);
  }

  const projectList = (projects || []) as Project[];

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
      {projectList.length > 0 && <ProjectList projects={projectList} />}

      {/* Empty state */}
      {projectList.length === 0 && (
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
