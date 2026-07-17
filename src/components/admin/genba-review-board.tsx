'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  EyeOff,
  ImageOff,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type { MediaPhase, MediaPublicationStatus } from '@/types/database';

export interface GenbaProjectOption {
  id: string;
  name: string;
  status: string;
}

export interface GenbaReviewItem {
  id: string;
  mediaId: string | null;
  projectId: string | null;
  projectName: string | null;
  phase: MediaPhase;
  confidence: number | null;
  state: string;
  action: string | null;
  receivedAt: string;
  senderName: string | null;
  error: string | null;
  imageAvailable: boolean;
  publicationStatus: MediaPublicationStatus;
  publishedAt: string | null;
}

type FilterKey = 'attention' | 'internal' | 'selected' | 'published' | 'all';

const filterLabels: Record<FilterKey, string> = {
  attention: '要確認',
  internal: '社内のみ',
  selected: '公開候補',
  published: '公開中',
  all: 'すべて',
};

const phaseLabels: Record<MediaPhase, string> = {
  before: '施工前',
  during: '施工中',
  after: '施工後',
};

const stateLabels: Record<string, string> = {
  received: '受信済み',
  archived: '原本保存済み',
  processing: 'AI判定中',
  resolving: '現場確認中',
  awaiting_confirmation: 'LINEの回答待ち',
  recorded: '写真を登録済み',
  ignored: '記録対象外',
  failed: '処理エラー',
};

function needsAttention(item: GenbaReviewItem): boolean {
  return item.state !== 'recorded' || item.confidence === null || item.confidence < 0.85;
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function confidenceText(confidence: number | null): string {
  if (confidence === null) return 'AIによる判定なし';
  return `AI判定の確信度 ${Math.round(confidence * 100)}%`;
}

export function GenbaReviewBoard({
  initialItems,
  projects,
  initialProjectId,
}: {
  initialItems: GenbaReviewItem[];
  projects: GenbaProjectOption[];
  initialProjectId?: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<FilterKey>(initialProjectId ? 'all' : 'attention');
  const [projectFilter, setProjectFilter] = useState(initialProjectId || 'all');
  const [drafts, setDrafts] = useState(() => new Map(
    initialItems.map((item) => [item.id, { projectId: item.projectId || '', phase: item.phase }]),
  ));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [unpublishingId, setUnpublishingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const counts = useMemo(() => ({
    attention: items.filter(needsAttention).length,
    internal: items.filter((item) => item.publicationStatus === 'internal').length,
    selected: items.filter((item) => item.publicationStatus === 'selected').length,
    published: items.filter((item) => item.publicationStatus === 'published').length,
    all: items.length,
  }), [items]);

  const visibleItems = useMemo(() => items.filter((item) => {
    if (projectFilter !== 'all' && item.projectId !== projectFilter) return false;
    if (filter === 'attention') return needsAttention(item);
    if (filter === 'all') return true;
    return item.publicationStatus === filter;
  }), [filter, items, projectFilter]);

  const selectedItems = items.filter((item) => item.publicationStatus === 'selected');

  const updateDraft = (eventId: string, patch: Partial<{ projectId: string; phase: MediaPhase }>) => {
    setDrafts((current) => {
      const next = new Map(current);
      next.set(eventId, { ...(current.get(eventId) || { projectId: '', phase: 'during' }), ...patch });
      return next;
    });
  };

  const saveReview = async (item: GenbaReviewItem, publicationStatus = item.publicationStatus) => {
    const draft = drafts.get(item.id);
    if (!draft?.projectId) {
      setNotice('現場を選んでください。');
      return false;
    }
    if (publicationStatus === 'published') return false;

    setSavingId(item.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/genba-ai/events/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: draft.projectId,
          phase: draft.phase,
          publicationStatus,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '保存できませんでした');

      const project = projects.find((candidate) => candidate.id === draft.projectId);
      setItems((current) => current.map((candidate) => candidate.id === item.id ? {
        ...candidate,
        projectId: draft.projectId,
        projectName: project?.name || candidate.projectName,
        phase: draft.phase,
        confidence: 1,
        publicationStatus,
      } : candidate));
      setNotice(publicationStatus === 'selected' ? '公開候補に追加しました。この時点では公開されません。' : '変更内容を保存しました。');
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存できませんでした');
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const publishSelected = async () => {
    setPublishing(true);
    setNotice(null);
    try {
      const response = await fetch('/api/genba-ai/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventIds: selectedItems.map((item) => item.id) }),
      });
      const payload = await response.json();
      if (!response.ok && response.status !== 207) throw new Error(payload.error || '公開できませんでした');

      const publishedIds = new Set<string>(payload.published || []);
      setItems((current) => current.map((item) => publishedIds.has(item.id)
        ? { ...item, publicationStatus: 'published', publishedAt: new Date().toISOString() }
        : item));
      setConfirmOpen(false);
      if (payload.failed?.length) {
        setNotice(`${publishedIds.size}枚を公開しました。${payload.failed.length}枚は公開できなかったため、公開候補のまま残っています。`);
      } else {
        setNotice(`${publishedIds.size}枚を公開サイトに掲載しました。`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '公開できませんでした');
    } finally {
      setPublishing(false);
    }
  };

  const stopPublishing = async (item: GenbaReviewItem) => {
    if (!window.confirm('この写真を公開サイトから取り下げます。よろしいですか？')) return;
    setUnpublishingId(item.id);
    setNotice(null);
    try {
      const response = await fetch('/api/genba-ai/unpublish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: item.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '掲載を停止できませんでした');
      setItems((current) => current.map((candidate) => candidate.id === item.id
        ? { ...candidate, publicationStatus: 'internal', publishedAt: null }
        : candidate));
      setNotice('公開サイトへの掲載を停止し、「社内のみ」に戻しました。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '掲載を停止できませんでした');
    } finally {
      setUnpublishingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[#176f64]">
            <Sparkles className="h-4 w-4" />
            LINE写真・AI判定
          </div>
          <h1 className="text-2xl font-semibold text-[#292720] sm:text-3xl">LINEで届いた写真を確認する</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f695d]">
            AIが判定した現場と工程を確認・訂正し、公開してよい写真だけを候補に追加します。候補に追加しただけでは公開されません。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
            className="h-11 rounded-xl border border-[#d8d1c1] bg-white px-3 text-sm text-[#39362f]"
            aria-label="現場で絞り込む"
          >
            <option value="all">すべての現場</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={selectedItems.length === 0}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#bb4f35] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a7432c] disabled:cursor-not-allowed disabled:bg-[#b9b2a5]"
          >
            公開候補 {selectedItems.length}枚を確認
            <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2" role="tablist" aria-label="写真の状態">
          {(Object.keys(filterLabels) as FilterKey[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                filter === key
                  ? 'border-[#176f64] bg-[#176f64] text-white'
                  : 'border-[#d8d1c1] bg-white text-[#645f54] hover:border-[#176f64]'
              }`}
            >
              {filterLabels[key]} <span className="ml-1 opacity-70">{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div role="status" className="rounded-xl border border-[#c9ded9] bg-[#edf7f4] px-4 py-3 text-sm text-[#155f56]">
          {notice}
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cec6b6] bg-white/55 px-6 py-14 text-center">
          <CheckCircle2 className="mx-auto h-9 w-9 text-[#6c9d91]" />
          <p className="mt-3 font-medium text-[#39362f]">この条件の写真はありません</p>
          <p className="mt-1 text-sm text-[#817a6e]">絞り込みを変えると、ほかの写真を確認できます。</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visibleItems.map((item) => {
            const draft = drafts.get(item.id) || { projectId: item.projectId || '', phase: item.phase };
            const editable = item.state === 'recorded' && Boolean(item.mediaId) && item.publicationStatus !== 'published';
            const selected = item.publicationStatus === 'selected';
            return (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-[#ddd6c8] bg-white shadow-[0_12px_30px_rgba(60,52,40,0.06)]">
                <div className="relative aspect-[4/3] bg-[#ded9ce]">
                  {item.imageAvailable ? (
                    // The private image route is authenticated and intentionally bypasses Next's public image optimizer.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/genba-ai/media/${item.id}`} alt={`${item.projectName || '未判定の現場'}のLINE写真`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-[#847d70]">
                      <ImageOff className="h-9 w-9" />
                      <span className="mt-2 text-xs">写真を表示できません</span>
                    </div>
                  )}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    {needsAttention(item) && (
                      <span className="inline-flex items-center rounded-full bg-[#fff3d8] px-2.5 py-1 text-xs font-semibold text-[#8b5b12] shadow-sm">
                        <AlertTriangle className="mr-1 h-3.5 w-3.5" /> 要確認
                      </span>
                    )}
                    {item.publicationStatus === 'published' ? (
                      <span className="inline-flex items-center rounded-full bg-[#176f64] px-2.5 py-1 text-xs font-semibold text-white shadow-sm"><Check className="mr-1 h-3.5 w-3.5" />公開中</span>
                    ) : selected ? (
                      <span className="inline-flex items-center rounded-full bg-[#bb4f35] px-2.5 py-1 text-xs font-semibold text-white shadow-sm">公開候補</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[#35322c]/85 px-2.5 py-1 text-xs font-semibold text-white shadow-sm"><EyeOff className="mr-1 h-3.5 w-3.5" />社内のみ</span>
                    )}
                  </div>
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#302e28]">{item.projectName || '現場を選んでください'}</p>
                      <p className="mt-1 text-xs text-[#817b70]">{formatDate(item.receivedAt)}{item.senderName ? ` ・ ${item.senderName}` : ''}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${needsAttention(item) ? 'bg-[#fff3d8] text-[#8b5b12]' : 'bg-[#e8f3ef] text-[#176f64]'}`}>
                      {confidenceText(item.confidence)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-medium text-[#655f54]">
                      現場
                      <select
                        value={draft.projectId}
                        onChange={(event) => updateDraft(item.id, { projectId: event.target.value })}
                        disabled={!editable}
                        className="mt-1.5 h-11 w-full rounded-xl border border-[#d8d1c1] bg-white px-3 text-sm text-[#302e28] disabled:bg-[#f3f0e9]"
                      >
                        <option value="">選択してください</option>
                        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-medium text-[#655f54]">
                      工程
                      <select
                        value={draft.phase}
                        onChange={(event) => updateDraft(item.id, { phase: event.target.value as MediaPhase })}
                        disabled={!editable}
                        className="mt-1.5 h-11 w-full rounded-xl border border-[#d8d1c1] bg-white px-3 text-sm text-[#302e28] disabled:bg-[#f3f0e9]"
                      >
                        {(Object.keys(phaseLabels) as MediaPhase[]).map((phase) => <option key={phase} value={phase}>{phaseLabels[phase]}</option>)}
                      </select>
                    </label>
                  </div>

                  {item.state !== 'recorded' && (
                    <div className="rounded-xl bg-[#f5f1e8] px-3 py-2.5 text-xs leading-5 text-[#6f695e]">
                      <span className="font-semibold">{stateLabels[item.state] || item.state}</span>
                      {item.error ? `：${item.error}` : '。LINEからの回答、または再処理の完了を待っています。'}
                    </div>
                  )}

                  {item.publicationStatus === 'published' ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#eaf4f1] px-3 py-3 text-sm text-[#176f64]">
                      <span className="inline-flex items-center font-medium"><ShieldCheck className="mr-2 h-4 w-4" />公開サイトに掲載中</span>
                      <span className="flex items-center gap-3">
                        {item.projectId && <Link href={`/works/${item.projectId}`} target="_blank" className="underline underline-offset-2">公開ページを確認</Link>}
                        <button type="button" onClick={() => stopPublishing(item)} disabled={unpublishingId === item.id} className="font-semibold text-[#9d3f2a] underline underline-offset-2 disabled:opacity-50">
                          {unpublishingId === item.id ? '停止中…' : '掲載を停止'}
                        </button>
                      </span>
                    </div>
                  ) : editable ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => saveReview(item)}
                        disabled={savingId === item.id}
                        className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-[#176f64] bg-white px-3 text-sm font-semibold text-[#176f64] hover:bg-[#edf7f4] disabled:opacity-50"
                      >
                        {savingId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        変更を保存
                      </button>
                      <button
                        type="button"
                        onClick={() => saveReview(item, selected ? 'internal' : 'selected')}
                        disabled={savingId === item.id || !draft.projectId}
                        className={`inline-flex h-11 flex-1 items-center justify-center rounded-xl px-3 text-sm font-semibold disabled:opacity-50 ${selected ? 'border border-[#b8b0a2] bg-white text-[#5f594e]' : 'bg-[#302e28] text-white hover:bg-[#176f64]'}`}
                      >
                        {selected ? <X className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                        {selected ? '候補から外す' : '公開候補に入れる'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center rounded-xl bg-[#f5f1e8] px-3 py-3 text-sm text-[#7b7468]">
                      <Clock3 className="mr-2 h-4 w-4" />処理が完了すると、内容の訂正と公開候補への追加ができます
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="publish-title">
          <div className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-[#bb4f35]">最終確認</p>
                <h2 id="publish-title" className="mt-1 text-xl font-semibold text-[#302e28]">{selectedItems.length}枚を公開しますか？</h2>
              </div>
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={publishing} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f0e9] text-[#4d4940]" aria-label="閉じる"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 rounded-2xl border border-[#ead5ce] bg-[#fff7f3] p-4 text-sm leading-6 text-[#714333]">
              <p className="font-semibold">この操作後、写真は公開サイトで誰でも見られる状態になります。</p>
              <p className="mt-1">非公開の原本はそのまま保管し、公開専用のコピーだけを作成します。</p>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={publishing} className="h-12 rounded-xl border border-[#d5cec0] px-5 text-sm font-semibold text-[#5f594e]">戻って確認</button>
              <button type="button" onClick={publishSelected} disabled={publishing || selectedItems.length === 0} className="inline-flex h-12 items-center justify-center rounded-xl bg-[#bb4f35] px-6 text-sm font-semibold text-white disabled:opacity-50">
                {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                確認した写真を公開する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
