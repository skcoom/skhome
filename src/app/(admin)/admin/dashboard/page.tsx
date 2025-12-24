import Link from 'next/link';
import { FolderKanban, ImageIcon, FileText, MessageSquare, Camera, ArrowRight, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  // 統計情報を取得
  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'in_progress');

  const { count: mediaCount } = await supabase
    .from('project_media')
    .select('*', { count: 'exact', head: true });

  const { count: blogCount } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact', head: true });

  const { count: contactCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // 進行中の現場を取得（メディア数付き）
  const { data: inProgressProjects } = await supabase
    .from('projects')
    .select(`
      *,
      project_media!project_media_project_id_fkey (id)
    `)
    .eq('status', 'in_progress')
    .order('updated_at', { ascending: false });

  const stats = [
    { name: '進行中の現場', value: projectCount ?? 0, icon: FolderKanban, color: 'bg-blue-500', href: '/admin/projects?status=in_progress' },
    { name: '登録メディア', value: mediaCount ?? 0, icon: ImageIcon, color: 'bg-green-500', href: '/admin/projects' },
    { name: 'ブログ記事', value: blogCount ?? 0, icon: FileText, color: 'bg-purple-500', href: '/admin/blog' },
    { name: '未対応の問い合わせ', value: contactCount ?? 0, icon: MessageSquare, color: 'bg-orange-500', href: '/admin/contacts' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-500">
          SKHOME へようこそ
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href} className="block overflow-hidden rounded-lg bg-white shadow hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md ${stat.color} p-3`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">{stat.name}</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stat.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 進行中の現場 */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">進行中の現場</h2>
          <Link
            href="/admin/projects/new"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <Plus className="h-4 w-4 mr-1" />
            新規登録
          </Link>
        </div>

        {inProgressProjects && inProgressProjects.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgressProjects.map((project) => {
              const mediaCount = Array.isArray(project.project_media) ? project.project_media.length : 0;
              const tags = project.tags || [];

              return (
                <Link
                  key={project.id}
                  href={`/admin/projects/${project.id}`}
                  className="group block rounded-lg border border-gray-200 p-4 hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate group-hover:text-blue-600">
                        {project.name}
                      </p>
                      {tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {tags.slice(0, 2).map((tag: string) => (
                            <span
                              key={tag}
                              className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                            >
                              {tag}
                            </span>
                          ))}
                          {tags.length > 2 && (
                            <span className="text-xs text-gray-400">+{tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0 ml-2" />
                  </div>

                  <div className="mt-3 flex items-center text-sm text-gray-500">
                    <Camera className="h-4 w-4 mr-1" />
                    <span>{mediaCount} 枚</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <FolderKanban className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">進行中の現場がありません</p>
            <Link
              href="/admin/projects/new"
              className="mt-3 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <Plus className="h-4 w-4 mr-1" />
              新規現場を登録
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
