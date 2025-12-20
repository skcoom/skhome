import Link from 'next/link';
import { FolderKanban, ImageIcon, FileText, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { HeroSettings } from '@/components/admin/HeroSettings';

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

  const stats = [
    { name: '進行中の現場', value: projectCount ?? 0, icon: FolderKanban, color: 'bg-blue-500' },
    { name: '登録メディア', value: mediaCount ?? 0, icon: ImageIcon, color: 'bg-green-500' },
    { name: 'ブログ記事', value: blogCount ?? 0, icon: FileText, color: 'bg-purple-500' },
    { name: '未対応の問い合わせ', value: contactCount ?? 0, icon: MessageSquare, color: 'bg-orange-500' },
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
          <div key={stat.name} className="overflow-hidden rounded-lg bg-white shadow">
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
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">クイックアクション</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/projects/new"
            className="flex items-center rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <FolderKanban className="h-8 w-8 text-gray-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">新規現場を登録</p>
              <p className="text-sm text-gray-500">現場情報を追加します</p>
            </div>
          </Link>
          <Link
            href="/projects"
            className="flex items-center rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <ImageIcon className="h-8 w-8 text-gray-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">写真/動画をアップロード</p>
              <p className="text-sm text-gray-500">施工写真を追加します</p>
            </div>
          </Link>
          <Link
            href="/admin/blog/new"
            className="flex items-center rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <FileText className="h-8 w-8 text-gray-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">ブログ記事を作成</p>
              <p className="text-sm text-gray-500">AIで記事を生成します</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
