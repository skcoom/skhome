import { createClient } from '@/lib/supabase/server';
import { HeroSettings } from '@/components/admin/HeroSettings';

export default async function SettingsPage() {
  const supabase = await createClient();

  // ファーストビュー設定用：全メディアを取得
  const { data: allMedia } = await supabase
    .from('project_media')
    .select(`
      *,
      projects:project_id (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false });

  // 現在のhero設定を取得
  const { data: heroMedia } = await supabase
    .from('project_media')
    .select(`
      *,
      projects:project_id (
        id,
        name
      )
    `)
    .not('hero_position', 'is', null)
    .order('hero_position', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">サイト設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          ホームページの表示設定を管理します
        </p>
      </div>

      {/* Hero Settings */}
      <HeroSettings
        allMedia={allMedia || []}
        initialHeroMedia={heroMedia || []}
      />
    </div>
  );
}
