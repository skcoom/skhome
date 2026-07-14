import type { SupabaseClient } from "../clients/supabase";
import { normalizeSiteText } from "../engine/normalization";
import type { GroupTemplateId, StoredLineEvent } from "../types";
import {
  explicitCorrectionTarget,
  isAffirmativeAnswer,
  isNegativeAnswer,
  pendingSiteNameAnswer,
} from "./answers";
import { resolveSiteAnswer } from "./site-answer";

export interface AnswerEvent {
  row: StoredLineEvent;
  replyToken: string | null;
}

export type SiteAnswerDb = Pick<
  SupabaseClient,
  | "findPendingQuestion"
  | "findRecentRecordedPhoto"
  | "getAliases"
  | "getAllSites"
  | "getBurstEvents"
  | "getSiteById"
  | "resolveBurstCorrection"
  | "updateLineEvents"
>;

export type SiteAnswerReply = (
  templateId: GroupTemplateId,
  values: Record<string, string | number>,
  token: string | null,
  eventIds: string[],
  sourceId: string,
  siteId?: string,
) => Promise<void>;

function timestamp(now: () => number): string {
  return new Date(now()).toISOString();
}

async function extendRecordedCorrectionWindow(
  events: StoredLineEvent[],
  db: SiteAnswerDb,
  now: () => number,
): Promise<void> {
  const recordedImageIds = events
    .filter((event) => Boolean(event.r2_key) && event.state === "recorded")
    .map((event) => event.id);
  await db.updateLineEvents(recordedImageIds, {
    correction_open_until: new Date(now() + 30 * 60_000).toISOString(),
  });
}

export async function resolvePendingQuestion(
  current: AnswerEvent,
  db: SiteAnswerDb,
  reply: SiteAnswerReply,
  now: () => number = Date.now,
): Promise<boolean> {
  const text = (current.row.text_content ?? "").trim();
  if (!text) return false;
  const since = new Date(new Date(current.row.received_at).getTime() - 24 * 3_600_000).toISOString();
  const pending = await db.findPendingQuestion(current.row.source_id, since, current.row.received_at);
  if (!pending || !pending.burst_id) return false;
  const burstEvents = await db.getBurstEvents(pending.burst_id);
  const isRecordedCorrection = burstEvents.some(
    (event) => Boolean(event.r2_key) && event.state === "recorded",
  );
  const expectedState = isRecordedCorrection ? "recorded" : "awaiting_confirmation";
  const processedAt = timestamp(now);

  if (isNegativeAnswer(text)) {
    const awaitingIds = burstEvents
      .filter((event) => event.state === "awaiting_confirmation")
      .map((event) => event.id);
    await db.updateLineEvents(awaitingIds, {
      site_id: null,
      action: "ignore",
      state: "ignored",
      error: "site_creation_cancelled",
      processed_at: processedAt,
      processing_started_at: null,
      burst_id: null,
    });
    await db.updateLineEvents([current.row.id], {
      action: "ignore",
      state: "ignored",
      processed_at: processedAt,
      processing_started_at: null,
    });
    return true;
  }

  if (pending.action === "create" && pending.new_site_name && isAffirmativeAnswer(text)) {
    const resolvedSiteId = await db.resolveBurstCorrection({
      answerEventId: current.row.id,
      burstId: pending.burst_id,
      expectedState,
      siteId: null,
      newSiteName: pending.new_site_name,
      observedAlias: pending.new_site_name,
      originalSiteId: isRecordedCorrection ? pending.site_id : null,
      learnAlias: false,
      details: { answer: text, burst_id: pending.burst_id, source: "site_creation_confirmation" },
    });
    if (!resolvedSiteId) {
      const awaitingIds = burstEvents
        .filter((event) => event.state === "awaiting_confirmation")
        .map((event) => event.id);
      await db.updateLineEvents(awaitingIds, {
        action: "ignore",
        state: "ignored",
        processed_at: processedAt,
        processing_started_at: null,
        burst_id: null,
      });
      await db.updateLineEvents([current.row.id], {
        action: "ignore",
        state: "ignored",
        processed_at: processedAt,
      });
      return true;
    }
    const createdSite = await db.getSiteById(resolvedSiteId);
    await reply(
      "create_done",
      { name: createdSite?.name ?? pending.new_site_name },
      current.replyToken,
      [current.row.id],
      current.row.source_id,
      resolvedSiteId,
    );
    return true;
  }

  const answerName = pendingSiteNameAnswer(text);
  if (!answerName) return false;
  const [sites, aliases] = await Promise.all([db.getAllSites(), db.getAliases()]);
  const siteAnswer = resolveSiteAnswer(answerName, sites, aliases);
  if (siteAnswer.kind === "ambiguous") {
    if (isRecordedCorrection) await extendRecordedCorrectionWindow(burstEvents, db, now);
    await db.updateLineEvents([current.row.id], {
      action: "ignore",
      state: "ignored",
      error: "site_answer_ambiguous",
      processed_at: processedAt,
      processing_started_at: null,
    });
    await reply(
      "photo_ask",
      { count: burstEvents.filter((event) => Boolean(event.r2_key)).length },
      current.replyToken,
      [current.row.id],
      current.row.source_id,
    );
    return true;
  }
  const site = siteAnswer.kind === "resolved" ? siteAnswer.site : undefined;
  if (!site) {
    if (isRecordedCorrection) await extendRecordedCorrectionWindow(burstEvents, db, now);
    const awaitingIds = burstEvents
      .filter((event) => event.state === "awaiting_confirmation")
      .map((event) => event.id);
    await db.updateLineEvents(awaitingIds, {
      site_id: isRecordedCorrection ? pending.site_id : null,
      action: "create",
      new_site_name: answerName,
      state: "awaiting_confirmation",
      processed_at: processedAt,
      processing_started_at: null,
    });
    await db.updateLineEvents([current.row.id], {
      action: "ignore",
      state: "ignored",
      processed_at: processedAt,
      processing_started_at: null,
    });
    await reply(
      "create_confirm",
      { name: answerName },
      current.replyToken,
      [current.row.id],
      current.row.source_id,
    );
    return true;
  }

  if (isRecordedCorrection && site.id === pending.site_id) {
    const awaitingIds = burstEvents
      .filter((event) => event.state === "awaiting_confirmation")
      .map((event) => event.id);
    await db.updateLineEvents(awaitingIds, {
      site_id: null,
      action: "ignore",
      state: "ignored",
      error: "correction_target_unchanged",
      processed_at: processedAt,
      processing_started_at: null,
      burst_id: null,
    });
    await db.updateLineEvents([current.row.id], {
      action: "ignore",
      state: "ignored",
      processed_at: processedAt,
      processing_started_at: null,
    });
    return true;
  }

  const resolvedSiteId = await db.resolveBurstCorrection({
    answerEventId: current.row.id,
    burstId: pending.burst_id,
    expectedState,
    siteId: site.id,
    newSiteName: null,
    observedAlias: answerName,
    originalSiteId: isRecordedCorrection ? pending.site_id : null,
    learnAlias: normalizeSiteText(answerName) !== normalizeSiteText(site.name),
    details: { answer: text, burst_id: pending.burst_id, source: "confirmation_reply" },
  });
  if (!resolvedSiteId) {
    await db.updateLineEvents([current.row.id], {
      action: "ignore",
      state: "ignored",
      processed_at: processedAt,
    });
    return true;
  }
  await reply(
    isRecordedCorrection ? "correction_done" : "answer_done",
    { site: site.name },
    current.replyToken,
    [current.row.id],
    current.row.source_id,
    resolvedSiteId,
  );
  return true;
}

export async function resolveRecordedCorrection(
  current: AnswerEvent,
  db: SiteAnswerDb,
  reply: SiteAnswerReply,
  now: () => number = Date.now,
): Promise<boolean> {
  const text = (current.row.text_content ?? "").trim();
  const target = explicitCorrectionTarget(text);
  if (!target) return false;
  const since = new Date(new Date(current.row.received_at).getTime() - 30 * 60_000).toISOString();
  const recent = await db.findRecentRecordedPhoto(current.row.source_id, since, current.row.received_at);
  if (!recent?.burst_id || !recent.site_id) return false;
  const [sites, aliases] = await Promise.all([db.getAllSites(), db.getAliases()]);
  const oldSite = sites.find((candidate) => candidate.id === recent.site_id);
  if (!oldSite) return false;
  const siteAnswer = resolveSiteAnswer(target, sites, aliases);
  const processedAt = timestamp(now);
  if (siteAnswer.kind === "ambiguous") {
    const burstEvents = await db.getBurstEvents(recent.burst_id);
    await extendRecordedCorrectionWindow(burstEvents, db, now);
    await db.updateLineEvents([current.row.id], {
      burst_id: recent.burst_id,
      site_id: oldSite.id,
      action: "ask",
      phase: recent.phase ?? "unknown",
      confidence: 1,
      candidates: siteAnswer.candidates.map((candidate) => candidate.id),
      new_site_name: null,
      state: "awaiting_confirmation",
      error: "correction_target_ambiguous",
      processed_at: processedAt,
      processing_started_at: null,
    });
    await reply(
      "photo_ask",
      { count: burstEvents.filter((event) => Boolean(event.r2_key)).length },
      current.replyToken,
      [current.row.id],
      current.row.source_id,
    );
    return true;
  }
  const newSite = siteAnswer.kind === "resolved" ? siteAnswer.site : undefined;
  if (newSite?.id === oldSite.id) {
    await db.updateLineEvents([current.row.id], {
      action: "ignore",
      state: "ignored",
      error: "correction_target_unchanged",
      processed_at: processedAt,
      processing_started_at: null,
    });
    return true;
  }
  if (!newSite) {
    const burstEvents = await db.getBurstEvents(recent.burst_id);
    await extendRecordedCorrectionWindow(burstEvents, db, now);
    await db.updateLineEvents([current.row.id], {
      burst_id: recent.burst_id,
      site_id: oldSite.id,
      action: "create",
      phase: recent.phase ?? "unknown",
      confidence: 1,
      candidates: [],
      new_site_name: target,
      state: "awaiting_confirmation",
      processed_at: processedAt,
      processing_started_at: null,
    });
    await reply(
      "create_confirm",
      { name: target },
      current.replyToken,
      [current.row.id],
      current.row.source_id,
    );
    return true;
  }
  const resolvedSiteId = await db.resolveBurstCorrection({
    answerEventId: current.row.id,
    burstId: recent.burst_id,
    expectedState: "recorded",
    siteId: newSite.id,
    newSiteName: null,
    observedAlias: target,
    originalSiteId: oldSite.id,
    learnAlias: normalizeSiteText(target) !== normalizeSiteText(newSite.name),
    details: { answer: text, burst_id: recent.burst_id, source: "recorded_burst_reply" },
  });
  if (!resolvedSiteId) {
    await db.updateLineEvents([current.row.id], {
      action: "ignore",
      state: "ignored",
      processed_at: processedAt,
    });
    return true;
  }
  await reply(
    "correction_done",
    { site: newSite.name },
    current.replyToken,
    [current.row.id],
    current.row.source_id,
    resolvedSiteId,
  );
  return true;
}
