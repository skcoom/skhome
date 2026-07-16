import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Images,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

function tokyoDayStart(): string {
  const tokyo = new Date(Date.now() + 9 * 60 * 60 * 1000);
  tokyo.setUTCHours(0, 0, 0, 0);
  return new Date(tokyo.getTime() - 9 * 60 * 60 * 1000).toISOString();
}

function formatRelativeTime(dateString: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 60_000));
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  return `${Math.floor(hours / 24)}日前`;
}

const stateLabels: Record<string, string> = {
  received: '受信済み', archived: '原本保存済み', processing: 'AI確認中', resolving: '現場確認中',
  awaiting_confirmation: 'LINEで確認待ち', recorded: '台帳登録済み', ignored: '記録対象外', failed: '処理エラー',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { user } = await getAuthUser();
  const canReviewLine = user?.role === 'admin' || user?.role === 'staff';

  const [{ count: projectCount }, { data: inProgressProjects, count: totalInProgress }, { count: contactCount }] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase
      .from('projects')
      .select('id, name, tags, updated_at, last_line_activity_at, project_media!project_media_project_id_fkey (id)', { count: 'exact' })
      .eq('status', 'in_progress')
      .order('last_line_activity_at', { ascending: false, nullsFirst: false })
      .limit(6),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  let lineToday = 0;
  let needsAttention = 0;
  let selectedForPublic = 0;
  let recentLineEvents: Array<{
    id: string;
    site_id: string | null;
    state: string;
    confidence: number | null;
    received_at: string;
    sender_name: string | null;
  }> = [];
  let projectNames = new Map<string, string>();

  if (canReviewLine) {
    const admin = createAdminClient();
    const [{ data: recent, count: todayCount }, { count: attentionCount }, { count: selectedCount }] = await Promise.all([
      admin
        .from('line_events')
        .select('id, site_id, state, confidence, received_at, sender_name', { count: 'exact' })
        .not('r2_key', 'is', null)
        .gte('received_at', tokyoDayStart())
        .order('received_at', { ascending: false })
        .limit(40),
      admin
        .from('line_events')
        .select('*', { count: 'exact', head: true })
        .not('r2_key', 'is', null)
        .or('state.neq.recorded,confidence.lt.0.85,confidence.is.null'),
      admin
        .from('project_media')
        .select('*', { count: 'exact', head: true })
        .eq('publication_status', 'selected'),
    ]);
    lineToday = todayCount || 0;
    needsAttention = attentionCount || 0;
    selectedForPublic = selectedCount || 0;
    recentLineEvents = (recent || []).slice(0, 6).map((event) => ({ ...event, confidence: event.confidence === null ? null : Number(event.confidence) }));

    const projectIds = [...new Set(recentLineEvents.map((event) => event.site_id).filter((id): id is string => Boolean(id)))];
    if (projectIds.length > 0) {
      const { data: names } = await admin.from('projects').select('id, name').in('id', projectIds);
      projectNames = new Map((names || []).map((project) => [project.id, project.name]));
    }
  }

  const stats = canReviewLine ? [
    { name: '今日届いたLINE写真', value: lineToday, icon: Camera, tone: 'teal', href: '/admin/genba' },
    { name: '要確認', value: needsAttention, icon: AlertTriangle, tone: 'amber', href: '/admin/genba' },
    { name: '公開候補', value: selectedForPublic, icon: ShieldCheck, tone: 'vermillion', href: '/admin/genba' },
    { name: '進行中の現場', value: projectCount || 0, icon: FolderKanban, tone: 'ink', href: '/admin/projects?status=in_progress' },
  ] : [
    { name: '進行中の現場', value: projectCount || 0, icon: FolderKanban, tone: 'ink', href: '/admin/projects?status=in_progress' },
    { name: '未対応の問い合わせ', value: contactCount || 0, icon: Clock3, tone: 'amber', href: '/admin/contacts' },
  ];

  const toneClasses: Record<string, string> = {
    teal: 'bg-[#e5f2ee] text-[#176f64]',
    amber: 'bg-[#fff1d4] text-[#996719]',
    vermillion: 'bg-[#f8e5df] text-[#ae482f]',
    ink: 'bg-[#ece9e1] text-[#34312b]',
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-[#176f64]">TODAY&apos;S SITES</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#292720] sm:text-3xl">今日の現場</h1>
          <p className="mt-2 text-sm text-[#756f63]">届いた写真と、確認が必要な項目を先に表示しています。</p>
        </div>
        <Link href="/admin/projects/new" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#302e28] px-5 text-sm font-semibold text-white hover:bg-[#176f64]">
          <Plus className="mr-2 h-4 w-4" />現場を登録
        </Link>
      </div>

      <div className={`grid gap-3 sm:grid-cols-2 ${canReviewLine ? 'xl:grid-cols-4' : ''}`}>
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href} className="group rounded-2xl border border-[#ddd6c8] bg-white p-5 shadow-[0_10px_24px_rgba(60,52,40,0.05)] transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses[stat.tone]}`}><stat.icon className="h-5 w-5" /></span>
              <ArrowRight className="h-4 w-4 text-[#aaa396] transition group-hover:translate-x-1 group-hover:text-[#176f64]" />
            </div>
            <p className="mt-5 text-3xl font-semibold text-[#2d2a25]">{stat.value}</p>
            <p className="mt-1 text-sm text-[#746e62]">{stat.name}</p>
          </Link>
        ))}
      </div>

      {canReviewLine && (
        <section className="overflow-hidden rounded-2xl border border-[#ddd6c8] bg-white shadow-[0_10px_24px_rgba(60,52,40,0.05)]">
          <div className="flex items-center justify-between border-b border-[#eee8dd] px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold text-[#302e28]">最新のLINE写真</h2>
              <p className="mt-0.5 text-xs text-[#827b6f]">今日受信した写真のAI処理状況</p>
            </div>
            <Link href="/admin/genba" className="inline-flex items-center text-sm font-semibold text-[#176f64]">すべて確認<ArrowRight className="ml-1 h-4 w-4" /></Link>
          </div>
          {recentLineEvents.length > 0 ? (
            <div className="divide-y divide-[#eee8dd]">
              {recentLineEvents.map((event) => {
                const attention = event.state !== 'recorded' || event.confidence === null || event.confidence < 0.85;
                return (
                  <Link key={event.id} href="/admin/genba" className="flex items-center gap-3 px-5 py-4 transition hover:bg-[#faf8f3] sm:px-6">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${attention ? 'bg-[#fff1d4] text-[#996719]' : 'bg-[#e5f2ee] text-[#176f64]'}`}>
                      {attention ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[#37342e]">{event.site_id ? projectNames.get(event.site_id) || '登録現場' : '現場未判定'}</span>
                      <span className="mt-0.5 block truncate text-xs text-[#817a6e]">{stateLabels[event.state] || event.state}{event.confidence !== null ? ` ・ AI ${Math.round(event.confidence * 100)}%` : ''}</span>
                    </span>
                    <span className="shrink-0 text-xs text-[#9a9387]">{formatRelativeTime(event.received_at)}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-sm text-[#827b6f]">今日届いたLINE写真はまだありません。</div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-[#ddd6c8] bg-white p-5 shadow-[0_10px_24px_rgba(60,52,40,0.05)] sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-[#302e28]">進行中の現場</h2>
            <p className="mt-0.5 text-xs text-[#827b6f]">LINEで最近動きがあった順</p>
          </div>
          <Link href="/admin/projects?status=in_progress" className="text-sm font-semibold text-[#176f64]">{totalInProgress || 0}件を表示</Link>
        </div>
        {inProgressProjects && inProgressProjects.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {inProgressProjects.map((project) => {
              const mediaCount = Array.isArray(project.project_media) ? project.project_media.length : 0;
              return (
                <Link key={project.id} href={`/admin/projects/${project.id}`} className="group rounded-xl border border-[#e4ded2] p-4 transition hover:border-[#6aa297] hover:bg-[#f4f9f7]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#35322c] group-hover:text-[#176f64]">{project.name}</p>
                      <p className="mt-2 inline-flex items-center text-xs text-[#817a6e]"><Images className="mr-1.5 h-3.5 w-3.5" />台帳写真 {mediaCount}枚</p>
                    </div>
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#aaa396] group-hover:text-[#176f64]" />
                  </div>
                  {project.last_line_activity_at && <p className="mt-3 text-xs text-[#9a9387]">LINE更新 {formatRelativeTime(project.last_line_activity_at)}</p>}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-[#d8d1c3] py-9 text-center text-sm text-[#827b6f]">進行中の現場はありません。</div>
        )}
      </section>
    </div>
  );
}
