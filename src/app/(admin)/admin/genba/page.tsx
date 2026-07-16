import { GenbaReviewBoard, type GenbaReviewItem } from '@/components/admin/genba-review-board';
import { requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { MediaPhase, MediaPublicationStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ project?: string }>;

export default async function GenbaPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await requireStaff();
  if (!user) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[#ded7c9] bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-[#302e28]">スタッフ専用の画面です</h1>
        <p className="mt-2 text-sm text-[#716b60]">LINE写真の原本とAI判定は、管理者・スタッフだけが確認できます。</p>
      </div>
    );
  }

  const admin = createAdminClient();
  const [{ data: events, error: eventsError }, { data: projects, error: projectsError }, resolvedSearchParams] = await Promise.all([
    admin
      .from('line_events')
      .select('id, site_id, phase, confidence, state, action, received_at, sender_name, error, r2_key')
      .not('r2_key', 'is', null)
      .order('received_at', { ascending: false })
      .limit(80),
    admin
      .from('projects')
      .select('id, name, status')
      .order('status', { ascending: true })
      .order('updated_at', { ascending: false }),
    searchParams,
  ]);

  if (eventsError || projectsError) {
    return (
      <div className="rounded-2xl border border-[#e6cfc5] bg-[#fff6f1] p-6 text-[#7b3e2d]">
        LINE写真の一覧を読み込めませんでした。時間を置いて再度お試しください。
      </div>
    );
  }

  const eventIds = (events || []).map((event) => event.id);
  const { data: mediaRows } = eventIds.length > 0
    ? await admin
      .from('project_media')
      .select('id, project_id, genba_line_event_id, publication_status, published_at')
      .in('genba_line_event_id', eventIds)
    : { data: [] };

  const projectById = new Map((projects || []).map((project) => [project.id, project]));
  const mediaByEvent = new Map((mediaRows || []).map((media) => [media.genba_line_event_id, media]));

  const initialItems: GenbaReviewItem[] = (events || []).map((event) => {
    const media = mediaByEvent.get(event.id);
    const projectId = media?.project_id || event.site_id || null;
    const phase = event.phase === 'before' || event.phase === 'after' ? event.phase : 'during';
    const status = media?.publication_status;
    const publicationStatus: MediaPublicationStatus = status === 'selected' || status === 'published' ? status : 'internal';
    return {
      id: event.id,
      mediaId: media?.id || null,
      projectId,
      projectName: projectId ? projectById.get(projectId)?.name || null : null,
      phase: phase as MediaPhase,
      confidence: event.confidence === null ? null : Number(event.confidence),
      state: event.state,
      action: event.action,
      receivedAt: event.received_at,
      senderName: event.sender_name,
      error: event.error,
      imageAvailable: Boolean(event.r2_key),
      publicationStatus,
      publishedAt: media?.published_at || null,
    };
  });

  return (
    <GenbaReviewBoard
      initialItems={initialItems}
      projects={(projects || []).map((project) => ({ id: project.id, name: project.name, status: project.status }))}
      initialProjectId={resolvedSearchParams.project}
    />
  );
}
