import { getDisplayName, getLineContent, getSenderId, getSourceId } from "../clients/line";
import { canAddVisionImage } from "../clients/anthropic";
import { SupabaseClient } from "../clients/supabase";
import { buildMatchContext } from "../engine/context";
import { classifySite } from "../engine/site-matcher";
import { extractSiteName, normalizeSiteText } from "../engine/normalization";
import type {
  Env,
  GroupTemplateId,
  LineImageMessage,
  LineMessageEvent,
  LineTextMessage,
  MatcherResult,
  MediaPhase,
  SiteRecord,
  StoredLineEvent,
  VisionImage,
} from "../types";
import {
  bareSiteNameAnswer,
  explicitCorrectionTarget,
  isAffirmativeAnswer,
  isNegativeAnswer,
  pendingSiteNameAnswer,
} from "./answers";
import { burstIdWithoutSender } from "./burst";
import {
  photoReplyFor,
  pushWithTemplate,
  replyWithTemplate,
  TemplateNotApprovedError,
} from "./templates";

export interface ArchivedImage {
  key: string;
  contentType: string;
}

export interface PreparedEvent {
  event: LineMessageEvent;
  row: StoredLineEvent;
  isNew: boolean;
  replyToken: string | null;
}

function safeKeyPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 180);
}

function fallbackBurstId(sourceId: string, senderId: string | null, timestamp: number): string {
  return `burst:${safeKeyPart(sourceId)}:${safeKeyPart(senderId ?? "unknown")}:${Math.floor(timestamp / 300_000)}`;
}

export function imageObjectKey(event: LineMessageEvent): string {
  return `raw/${safeKeyPart(getSourceId(event.source))}/${safeKeyPart(event.message.id)}`;
}

async function archiveImage(event: LineMessageEvent, env: Env): Promise<ArchivedImage> {
  const key = imageObjectKey(event);
  const existing = await env.PHOTOS.head(key);
  if (existing) {
    return {
      key,
      contentType: existing.httpMetadata?.contentType ?? "application/octet-stream",
    };
  }
  const content = await getLineContent(event.message.id, env);
  await env.PHOTOS.put(key, content.bytes, {
    httpMetadata: { contentType: content.contentType },
    customMetadata: {
      messageId: event.message.id,
      sourceId: getSourceId(event.source),
      receivedAt: new Date(event.timestamp).toISOString(),
    },
  });
  return { key, contentType: content.contentType };
}

export async function archiveMessageImages(
  events: LineMessageEvent[],
  env: Env,
): Promise<Map<string, ArchivedImage>> {
  const archived = new Map<string, ArchivedImage>();
  await Promise.all(events.map(async (event) => {
    if (event.message.type === "image") archived.set(event.message.id, await archiveImage(event, env));
  }));
  return archived;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
}

function visionMediaType(contentType: string | null): VisionImage["mediaType"] | null {
  if (contentType === "image/jpeg" || contentType === "image/png" || contentType === "image/gif" || contentType === "image/webp") {
    return contentType;
  }
  return null;
}

async function loadVisionImages(events: StoredLineEvent[], env: Env): Promise<VisionImage[]> {
  const images: VisionImage[] = [];
  let totalBytes = 0;
  for (const event of events) {
    if (!event.r2_key || images.length >= 10) continue;
    const mediaType = visionMediaType(event.content_type);
    if (!mediaType) continue;
    const object = await env.PHOTOS.get(event.r2_key);
    if (!object || !canAddVisionImage(totalBytes, object.size, images.length)) continue;
    images.push({ mediaType, data: toBase64(await object.arrayBuffer()) });
    totalBytes += object.size;
  }
  return images;
}

async function observeNormalizationHit(
  text: string | null,
  result: MatcherResult,
  lineEventId: string,
  db: SupabaseClient,
): Promise<void> {
  if (!text || result.action !== "assign" || !result.site_id || !result.site_name) return;
  const observed = extractSiteName(text);
  if (observed === result.site_name) return;
  const normalizedObserved = normalizeSiteText(observed);
  const normalizedSite = normalizeSiteText(result.site_name);
  if (!normalizedObserved.includes(normalizedSite) && !normalizedSite.includes(normalizedObserved)) return;
  try {
    await db.insertCorrectionLog({
      line_event_id: lineEventId,
      site_id: result.site_id,
      observed_alias: observed,
      normalized_alias: normalizedObserved,
      log_type: "normalization_hit",
      details: { source: "normalization" },
    });
  } catch (error) {
    console.warn("normalization observation could not be recorded", error instanceof Error ? error.message : error);
  }
}

async function recordImages(
  site: SiteRecord | null,
  events: StoredLineEvent[],
  result: MatcherResult,
  db: SupabaseClient,
): Promise<string> {
  const burstIds = [...new Set(events.map((event) => event.burst_id).filter((id): id is string => Boolean(id)))];
  const burstId = burstIds[0];
  if (!burstId || burstIds.length !== 1) throw new Error("A recorded photo set must have exactly one burst id");
  if (result.action !== "assign" || !site) throw new Error("Only an existing-site assignment can record images directly");
  return db.recordLineBurst({
    burstId,
    siteId: site.id,
    action: "assign",
    phase: result.phase,
    confidence: result.confidence,
  });
}

function firstReplyToken(prepared: PreparedEvent[], eventIds: Set<string>): string | null {
  return prepared.find((item) => eventIds.has(item.row.id) && item.replyToken)?.replyToken ?? null;
}

function startOfTodayJst(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = new Map(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return new Date(`${parts.get("year")}-${parts.get("month")}-${parts.get("day")}T00:00:00+09:00`).toISOString();
}

async function safeAlert(
  reason: string,
  eventIds: string[],
  db: SupabaseClient,
  env: Env,
): Promise<void> {
  try {
    const representativeId = eventIds[0];
    if (!representativeId) return;
    await pushWithTemplate(
      "T-07",
      { エラー要約: reason },
      env.LINE_SUMMARY_USER_ID,
      db,
      env,
      representativeId,
    );
    await db.updateLineEvents([representativeId], { reply_sent_at: new Date().toISOString() });
  } catch (error) {
    if (error instanceof TemplateNotApprovedError) {
      console.warn(error.message);
      return;
    }
    const message = error instanceof Error ? error.message : "unknown LINE reply error";
    console.error("LINE reply failed after ledger processing", message);
    if (eventIds[0]) {
      await db.updateLineEvents([eventIds[0]], { error: message.slice(0, 1000) }).catch(() => undefined);
    }
  }
}

async function safeReply(
  templateId: GroupTemplateId,
  values: Record<string, string | number>,
  token: string | null,
  eventIds: string[],
  sourceId: string,
  db: SupabaseClient,
  env: Env,
): Promise<void> {
  if (!token) return;
  try {
    const sent = await db.getReplyEvents(sourceId, startOfTodayJst());
    if (sent.length >= 10) {
      const alreadyAlerted = sent.some((event) => event.error === "daily_reply_limit_alerted");
      if (!alreadyAlerted) {
        await safeAlert("1日の自発発言上限（10回）に達しました", eventIds, db, env);
        if (eventIds[0]) await db.updateLineEvents([eventIds[0]], { error: "daily_reply_limit_alerted" });
      }
      return;
    }
    await replyWithTemplate(templateId, values, token, db, env);
    if (eventIds[0]) {
      await db.updateLineEvents([eventIds[0]], {
        reply_sent_at: new Date().toISOString(),
        ...(templateId === "photo_auto"
          ? { correction_open_until: new Date(Date.now() + 30 * 60_000).toISOString() }
          : {}),
      });
    }
  } catch (error) {
    if (error instanceof TemplateNotApprovedError) {
      console.warn(error.message);
      return;
    }
    throw error;
  }
}

function failureCategory(error: string): string {
  if (error.startsWith("Confirmation delivery unavailable")) return "確認返信の期限内に判定できませんでした";
  if (error.startsWith("Claude") || error.includes("AI")) return "AI判定で同じエラーが2回連続しました";
  if (error.startsWith("Supabase")) return "台帳処理で同じエラーが2回連続しました";
  if (error.startsWith("LINE")) return "LINE連携で同じエラーが2回連続しました";
  return "現場記録処理で同じエラーが2回連続しました";
}

async function repeatedFailureRows(db: SupabaseClient): Promise<StoredLineEvent[] | null> {
  const terminal = await db.getTerminalFailure();
  if (terminal) return [terminal];
  const rows = await db.getLatestProcessedEvents();
  const seen = new Set<string>();
  const attempts: StoredLineEvent[] = [];
  for (const row of rows) {
    const key = row.burst_id ?? row.message_id;
    if (seen.has(key)) continue;
    seen.add(key);
    attempts.push(row);
    if (attempts.length === 2) break;
  }
  return attempts.length === 2
    && attempts[0]?.state === "failed"
    && attempts[1]?.state === "failed"
    && Boolean(attempts[0].error)
    && Boolean(attempts[1].error)
    && attempts[0].error?.split(":", 1)[0] === attempts[1].error?.split(":", 1)[0]
    ? attempts
    : null;
}

async function applyBurstResult(
  result: MatcherResult,
  events: StoredLineEvent[],
  prepared: PreparedEvent[],
  contextSites: SiteRecord[],
  db: SupabaseClient,
  env: Env,
): Promise<void> {
  const ids = events.map((event) => event.id);
  const token = firstReplyToken(prepared, new Set(ids));
  if (result.action === "ignore") {
    await db.updateLineEvents(ids, {
      action: "ignore",
      phase: result.phase,
      confidence: result.confidence,
      state: "ignored",
      processed_at: new Date().toISOString(),
    });
    return;
  }

  const burstEvents = events.filter((event) => event.r2_key);
  const site = result.site_id ? contextSites.find((item) => item.id === result.site_id) : undefined;
  if (result.action === "assign" && site) {
    await recordImages(site, burstEvents, result, db);
    await safeReply(
      "photo_auto",
      { count: burstEvents.length, site: site.name },
      token,
      ids,
      events[0]?.source_id ?? "",
      db,
      env,
    );
    return;
  }

  if (!token) {
    const error = "Confirmation delivery unavailable: reply token expired before recovery";
    await db.updateLineEvents(ids, {
      site_id: result.site_id ?? null,
      action: result.action,
      phase: result.phase,
      confidence: result.confidence,
      candidates: result.candidates,
      new_site_name: result.new_site_name ?? null,
      state: "failed",
      error,
      processed_at: new Date().toISOString(),
      processing_started_at: null,
    });
    await safeAlert(failureCategory(error), ids, db, env).catch((alertError) => {
      console.error("terminal confirmation alert could not be sent", alertError instanceof Error ? alertError.message : alertError);
    });
    return;
  }

  await db.updateLineEvents(ids, {
    site_id: result.site_id ?? null,
    action: result.action,
    phase: result.phase,
    confidence: result.confidence,
    candidates: result.candidates,
    new_site_name: result.new_site_name ?? null,
    state: "awaiting_confirmation",
    processed_at: new Date().toISOString(),
  });
  const confirmation = photoReplyFor(result, contextSites, burstEvents.length);
  await safeReply(
    confirmation.templateId,
    confirmation.values,
    token,
    ids,
    events[0]?.source_id ?? "",
    db,
    env,
  );
}

async function processImageBurst(
  burstId: string,
  prepared: PreparedEvent[],
  db: SupabaseClient,
  env: Env,
): Promise<void> {
  const allEvents = await db.getBurstEvents(burstId);
  const newEvents = prepared.filter((item) => item.isNew && item.row.burst_id === burstId).map((item) => item.row);
  const priorRecorded = allEvents.find((event) => event.state === "recorded" && event.site_id);
  if (priorRecorded?.site_id) {
    const sites = await db.getAllSites();
    const site = sites.find((candidate) => candidate.id === priorRecorded.site_id);
    if (site) {
      const eventsToAttach = newEvents.length > 0
        ? newEvents
        : allEvents.filter((event) => event.state === "archived" || event.state === "processing");
      await recordImages(site, eventsToAttach, {
        action: "assign",
        site_id: site.id,
        site_name: site.name,
        candidates: [],
        phase: priorRecorded.phase ?? "unknown",
        confidence: priorRecorded.confidence ?? 0.85,
        reasoning: "同一送信者の5分以内の写真バースト",
      }, db);
    }
    return;
  }
  const priorAwaiting = allEvents.find((event) => event.state === "awaiting_confirmation");
  if (priorAwaiting) {
    const newlyAttached = allEvents.filter((event) => event.state === "archived" || event.state === "processing");
    await db.updateLineEvents(newlyAttached.map((event) => event.id), {
      site_id: priorAwaiting.site_id,
      action: priorAwaiting.action,
      phase: priorAwaiting.phase,
      confidence: priorAwaiting.confidence,
      candidates: priorAwaiting.candidates ?? [],
      new_site_name: priorAwaiting.new_site_name ?? null,
      state: "awaiting_confirmation",
      processed_at: priorAwaiting.processed_at,
      processing_started_at: null,
    });
    return;
  }
  await db.updateLineEvents(allEvents.map((event) => event.id), { state: "processing" });
  try {
    const context = await buildMatchContext(allEvents, db);
    const images = await loadVisionImages(allEvents, env);
    const result = await classifySite(context, images, env);
    await observeNormalizationHit(context.event.text, result, allEvents[0]?.id ?? "", db);
    await applyBurstResult(result, allEvents, prepared, context.sites, db, env);
  } catch (error) {
    const refreshed = await db.getBurstEvents(burstId).catch(() => null);
    if (!refreshed) throw error;
    const refreshedImages = refreshed.filter((event) => event.r2_key);
    const committed = refreshedImages.length > 0
      && refreshedImages.every((event) => event.state === "recorded" && Boolean(event.site_id));
    if (!committed) {
      await db.updateLineEvents(allEvents.map((event) => event.id), {
        state: "failed",
        error: error instanceof Error ? error.message.slice(0, 1000) : "unknown error",
        processed_at: new Date().toISOString(),
      });
    }
    throw error;
  }
}

function findSiteByAnswer(
  text: string,
  sites: SiteRecord[],
  aliases: Awaited<ReturnType<SupabaseClient["getAliases"]>>,
): SiteRecord | undefined {
  const normalized = normalizeSiteText(text);
  const direct = sites.find((candidate) => normalizeSiteText(candidate.name) === normalized);
  if (direct) return direct;
  const alias = aliases.find((candidate) => normalizeSiteText(candidate.alias) === normalized);
  return alias ? sites.find((candidate) => candidate.id === alias.site_id) : undefined;
}

async function resolvePendingQuestion(
  current: PreparedEvent,
  db: SupabaseClient,
  env: Env,
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

  if (isNegativeAnswer(text)) {
    const awaitingIds = burstEvents
      .filter((event) => event.state === "awaiting_confirmation")
      .map((event) => event.id);
    await db.updateLineEvents(awaitingIds, {
      site_id: null,
      action: "ignore",
      state: "ignored",
      error: "site_creation_cancelled",
      processed_at: new Date().toISOString(),
      processing_started_at: null,
      burst_id: null,
    });
    await db.updateLineEvents([current.row.id], {
      action: "ignore",
      state: "ignored",
      processed_at: new Date().toISOString(),
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
        processed_at: new Date().toISOString(),
        processing_started_at: null,
        burst_id: null,
      });
      await db.updateLineEvents([current.row.id], {
        action: "ignore",
        state: "ignored",
        processed_at: new Date().toISOString(),
      });
      return true;
    }
    const createdSite = await db.getSiteById(resolvedSiteId);
    await safeReply(
      "create_done",
      { name: createdSite?.name ?? pending.new_site_name },
      current.replyToken,
      [current.row.id],
      current.row.source_id,
      db,
      env,
    );
    return true;
  }

  const answerName = pendingSiteNameAnswer(text);
  if (!answerName) return false;
  const [sites, aliases] = await Promise.all([db.getAllSites(), db.getAliases()]);
  const site = findSiteByAnswer(answerName, sites, aliases);
  if (!site) {
    const awaitingIds = burstEvents
      .filter((event) => event.state === "awaiting_confirmation")
      .map((event) => event.id);
    await db.updateLineEvents(awaitingIds, {
      site_id: isRecordedCorrection ? pending.site_id : null,
      action: "create",
      new_site_name: answerName,
      state: "awaiting_confirmation",
      processed_at: new Date().toISOString(),
      processing_started_at: null,
    });
    await db.updateLineEvents([current.row.id], {
      action: "ignore",
      state: "ignored",
      processed_at: new Date().toISOString(),
      processing_started_at: null,
    });
    await safeReply(
      "create_confirm",
      { name: answerName },
      current.replyToken,
      [current.row.id],
      current.row.source_id,
      db,
      env,
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
      processed_at: new Date().toISOString(),
      processing_started_at: null,
      burst_id: null,
    });
    await db.updateLineEvents([current.row.id], {
      action: "ignore",
      state: "ignored",
      processed_at: new Date().toISOString(),
      processing_started_at: null,
    });
    return true;
  }

  const shouldLearn = normalizeSiteText(answerName) !== normalizeSiteText(site.name);
  const resolvedSiteId = await db.resolveBurstCorrection({
    answerEventId: current.row.id,
    burstId: pending.burst_id,
    expectedState,
    siteId: site.id,
    newSiteName: null,
    observedAlias: answerName,
    originalSiteId: isRecordedCorrection ? pending.site_id : null,
    learnAlias: shouldLearn,
    details: { answer: text, burst_id: pending.burst_id, source: "confirmation_reply" },
  });
  if (!resolvedSiteId) {
    await db.updateLineEvents([current.row.id], {
      action: "ignore",
      state: "ignored",
      processed_at: new Date().toISOString(),
    });
    return true;
  }
  await safeReply(
    isRecordedCorrection ? "correction_done" : "answer_done",
    { site: site.name },
    current.replyToken,
    [current.row.id],
    current.row.source_id,
    db,
    env,
  );
  return true;
}

async function resolveRecordedCorrection(
  current: PreparedEvent,
  db: SupabaseClient,
  env: Env,
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
  const newSite = findSiteByAnswer(target, sites, aliases);
  if (newSite?.id === oldSite.id) {
    await db.updateLineEvents([current.row.id], {
      action: "ignore",
      state: "ignored",
      error: "correction_target_unchanged",
      processed_at: new Date().toISOString(),
      processing_started_at: null,
    });
    return true;
  }
  if (!newSite) {
    await db.updateLineEvents([current.row.id], {
      burst_id: recent.burst_id,
      site_id: oldSite.id,
      action: "create",
      phase: recent.phase ?? "unknown",
      confidence: 1,
      candidates: [],
      new_site_name: target,
      state: "awaiting_confirmation",
      processed_at: new Date().toISOString(),
      processing_started_at: null,
    });
    await safeReply(
      "create_confirm",
      { name: target },
      current.replyToken,
      [current.row.id],
      current.row.source_id,
      db,
      env,
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
      processed_at: new Date().toISOString(),
    });
    return true;
  }
  await safeReply(
    "correction_done",
    { site: newSite.name },
    current.replyToken,
    [current.row.id],
    current.row.source_id,
    db,
    env,
  );
  return true;
}

async function processTextEvent(current: PreparedEvent, db: SupabaseClient, env: Env): Promise<void> {
  try {
    const text = (current.row.text_content ?? "").trim();
    if (explicitCorrectionTarget(text)) {
      if (await resolveRecordedCorrection(current, db, env)) return;
      await db.updateLineEvents([current.row.id], {
        action: "ignore",
        state: "ignored",
        error: "correction_target_not_found",
        processed_at: new Date().toISOString(),
        processing_started_at: null,
      });
      return;
    }
    if (await resolvePendingQuestion(current, db, env)) return;
    const context = await buildMatchContext([current.row], db);
    const result = await classifySite(context, [], env);
    await observeNormalizationHit(context.event.text, result, current.row.id, db);
    if (result.action === "ignore") {
      await db.updateLineEvents([current.row.id], {
        action: "ignore",
        state: "ignored",
        confidence: result.confidence,
        processed_at: new Date().toISOString(),
      });
      return;
    }
    const site = result.site_id ? context.sites.find((candidate) => candidate.id === result.site_id) : undefined;
    if (result.action === "assign" && site) {
      const exactSiteAnswer = bareSiteNameAnswer(text)
        ? findSiteByAnswer(text, context.sites, context.aliases)
        : undefined;
      if (exactSiteAnswer?.id === site.id) {
        await db.updateLineEvents([current.row.id], {
          site_id: null,
          action: "ignore",
          state: "ignored",
          error: "site_name_without_pending_question",
          processed_at: new Date().toISOString(),
          processing_started_at: null,
        });
        return;
      }
      await db.recordLineText({
        eventId: current.row.id,
        siteId: site.id,
        action: "assign",
        phase: result.phase,
        confidence: result.confidence,
        description: current.row.text_content ?? "",
      });
      return;
    }
    await db.updateLineEvents([current.row.id], {
      site_id: null,
      action: result.action,
      phase: result.phase,
      candidates: result.candidates,
      new_site_name: result.new_site_name ?? null,
      state: "ignored",
      confidence: result.confidence,
      error: "text_requires_known_site",
      processed_at: new Date().toISOString(),
      processing_started_at: null,
    });
  } catch (error) {
    const refreshed = await db.getLineEvent(current.row.id).catch(() => null);
    if (!refreshed) throw error;
    if (refreshed.state !== "recorded" && refreshed.state !== "ignored") {
      await db.updateLineEvents([current.row.id], {
        state: "failed",
        error: error instanceof Error ? error.message.slice(0, 1000) : "unknown error",
        processed_at: new Date().toISOString(),
      });
    }
    throw error;
  }
}

export async function registerMessageEvents(
  events: LineMessageEvent[],
  archived: Map<string, ArchivedImage>,
  env: Env,
): Promise<PreparedEvent[]> {
  const messageEvents = [...events]
    .filter((event) => event.message.type === "image" || event.message.type === "text")
    .sort((left, right) => left.timestamp - right.timestamp);
  if (env.TEST_MODE === "true") return [];

  const db = new SupabaseClient(env);
  const rows: Array<Record<string, unknown>> = [];
  const eventByMessageId = new Map(messageEvents.map((event) => [event.message.id, event]));
  const localBursts: Array<{ sourceId: string; senderId: string | null; timestamp: number; burstId: string }> = [];
  for (const event of messageEvents) {
    const sourceId = getSourceId(event.source);
    const senderId = getSenderId(event.source);
    const receivedAt = new Date(event.timestamp).toISOString();
    let burstId: string | null = null;
    if (event.message.type === "image") {
      if (!senderId) {
        burstId = burstIdWithoutSender(sourceId, event.message.id);
      } else {
        const localRecent = [...localBursts].reverse().find((candidate) =>
          candidate.sourceId === sourceId
          && candidate.senderId === senderId
          && event.timestamp - candidate.timestamp <= 5 * 60_000,
        );
        const since = new Date(event.timestamp - 5 * 60_000).toISOString();
        const recent = localRecent ? null : await db.findRecentBurst(sourceId, senderId, since, receivedAt);
        burstId = localRecent?.burstId ?? recent?.burst_id ?? fallbackBurstId(sourceId, senderId, event.timestamp);
        localBursts.push({ sourceId, senderId, timestamp: event.timestamp, burstId });
      }
    }
    const image = archived.get(event.message.id);
    rows.push({
      message_id: event.message.id,
      webhook_event_id: event.webhookEventId ?? null,
      event_type: `message:${event.message.type}`,
      source_type: event.source.type,
      source_id: sourceId,
      sender_id: senderId,
      sender_name: null,
      raw_payload: event,
      text_content: event.message.type === "text" ? (event.message as LineTextMessage).text : null,
      r2_key: image?.key ?? null,
      content_type: image?.contentType ?? null,
      burst_id: burstId,
      state: event.message.type === "image" ? "archived" : "received",
      received_at: receivedAt,
    });
  }
  const claimedRows = await db.registerLineEventsBatch(rows);
  return claimedRows.flatMap((row) => {
    const event = eventByMessageId.get(row.message_id) ?? row.raw_payload;
    return event ? [{ event, row, isNew: true, replyToken: event.replyToken ?? null }] : [];
  });
}

async function hydrateSenderNames(
  prepared: PreparedEvent[],
  db: SupabaseClient,
  env: Env,
): Promise<PreparedEvent[]> {
  return Promise.all(prepared.map(async (item) => {
    const senderName = await getDisplayName(item.event.source, env).catch(() => null);
    if (!senderName) return item;
    await db.updateLineEvents([item.row.id], { sender_name: senderName });
    return { ...item, row: { ...item.row, sender_name: senderName } };
  }));
}

export async function processPreparedMessageEvents(
  input: PreparedEvent[],
  env: Env,
): Promise<void> {
  if (env.TEST_MODE === "true") return;
  const db = new SupabaseClient(env);
  const prepared = await hydrateSenderNames(input, db, env);

  const failures = await repeatedFailureRows(db);
  if (failures?.[0]?.error) {
    if (!failures.some((failure) => failure.reply_sent_at)) {
      await safeAlert(
        failureCategory(failures[0].error),
        failures.map((failure) => failure.id),
        db,
        env,
      );
    }
    return;
  }

  for (const item of prepared.filter((candidate) => candidate.isNew && candidate.event.message.type === "text")) {
    await processTextEvent(item, db, env);
  }
  const bursts = new Set(
    prepared.filter((item) => item.isNew && item.event.message.type === "image")
      .map((item) => item.row.burst_id)
      .filter((id): id is string => Boolean(id)),
  );
  for (const burstId of bursts) {
    if (await db.claimBurst(burstId)) {
      await processImageBurst(burstId, prepared, db, env);
      continue;
    }
    const existingBurst = await db.getBurstEvents(burstId);
    if (existingBurst.some((event) => event.state === "recorded" && event.site_id)) {
      await processImageBurst(burstId, prepared, db, env);
    }
  }
}

export async function recoverPendingEvents(env: Env, scheduledTime: number): Promise<void> {
  if (env.TEST_MODE === "true") return;
  const db = new SupabaseClient(env);
  if (await repeatedFailureRows(db)) return;
  const receivedCutoff = new Date(scheduledTime - 2 * 60_000).toISOString();
  const processingCutoff = new Date(scheduledTime - 10 * 60_000).toISOString();
  const textId = await db.claimRecoverableText(receivedCutoff, processingCutoff);
  if (textId) {
    const row = await db.getLineEvent(textId);
    if (row) {
      await processTextEvent({ event: row.raw_payload, row, isNew: true, replyToken: null }, db, env);
    }
  }
  const burstId = await db.claimRecoverableBurst(receivedCutoff, processingCutoff);
  if (burstId) await processImageBurst(burstId, [], db, env);
}
