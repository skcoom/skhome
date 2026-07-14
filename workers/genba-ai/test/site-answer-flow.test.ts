import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "../src/clients/supabase";
import {
  resolvePendingQuestion,
  resolveRecordedCorrection,
  type SiteAnswerDb,
  type SiteAnswerReply,
} from "../src/services/site-answer-flow";
import type {
  AliasRecord,
  GroupTemplateId,
  SiteRecord,
  StoredLineEvent,
} from "../src/types";

function storedEvent(overrides: Partial<StoredLineEvent>): StoredLineEvent {
  const id = overrides.id ?? "event-default";
  const receivedAt = overrides.received_at ?? "2026-07-14T00:00:00.000Z";
  return {
    id,
    message_id: overrides.message_id ?? `message-${id}`,
    source_id: overrides.source_id ?? "group-test",
    sender_id: overrides.sender_id ?? "sender-test",
    sender_name: overrides.sender_name ?? "テスト担当",
    raw_payload: overrides.raw_payload ?? {
      type: "message",
      timestamp: new Date(receivedAt).getTime(),
      source: { type: "group", groupId: "group-test", userId: "sender-test" },
      message: { id: `message-${id}`, type: "text", text: overrides.text_content ?? "" },
    },
    text_content: overrides.text_content ?? null,
    r2_key: overrides.r2_key ?? null,
    content_type: overrides.content_type ?? null,
    burst_id: overrides.burst_id ?? null,
    site_id: overrides.site_id ?? null,
    action: overrides.action ?? null,
    phase: overrides.phase ?? null,
    confidence: overrides.confidence ?? null,
    candidates: overrides.candidates ?? null,
    state: overrides.state ?? "received",
    error: overrides.error ?? null,
    received_at: receivedAt,
    processed_at: overrides.processed_at ?? null,
    reply_sent_at: overrides.reply_sent_at ?? null,
    attempt_count: overrides.attempt_count ?? 0,
  };
}

type ResolutionArgs = Parameters<SupabaseClient["resolveBurstCorrection"]>[0];

class MemoryDb {
  readonly updates: Array<{ ids: string[]; patch: Record<string, unknown> }> = [];
  readonly resolutions: ResolutionArgs[] = [];
  recentPhotoId: string | null = null;

  constructor(
    readonly rows: StoredLineEvent[],
    readonly sites: SiteRecord[],
    readonly aliases: AliasRecord[],
  ) {}

  async findPendingQuestion(): Promise<StoredLineEvent | null> {
    return this.rows.find((row) => row.state === "awaiting_confirmation" && row.burst_id) ?? null;
  }

  async findRecentRecordedPhoto(): Promise<StoredLineEvent | null> {
    return this.rows.find((row) => row.id === this.recentPhotoId) ?? null;
  }

  async getAliases(): Promise<AliasRecord[]> {
    return this.aliases;
  }

  async getAllSites(): Promise<SiteRecord[]> {
    return this.sites;
  }

  async getBurstEvents(burstId: string): Promise<StoredLineEvent[]> {
    return this.rows.filter((row) => row.burst_id === burstId);
  }

  async getSiteById(siteId: string): Promise<SiteRecord | null> {
    return this.sites.find((site) => site.id === siteId) ?? null;
  }

  async updateLineEvents(ids: string[], patch: Record<string, unknown>): Promise<void> {
    this.updates.push({ ids: [...ids], patch: { ...patch } });
    for (const row of this.rows.filter((candidate) => ids.includes(candidate.id))) {
      Object.assign(row, patch);
    }
  }

  async resolveBurstCorrection(args: ResolutionArgs): Promise<string | null> {
    this.resolutions.push(args);
    return args.siteId;
  }
}

interface ReplyCall {
  templateId: GroupTemplateId;
  values: Record<string, string | number>;
  token: string | null;
  eventIds: string[];
  sourceId: string;
}

function replyRecorder(calls: ReplyCall[]): SiteAnswerReply {
  return async (templateId, values, token, eventIds, sourceId) => {
    calls.push({ templateId, values, token, eventIds, sourceId });
  };
}

const roomSites: SiteRecord[] = [
  { id: "site-old", name: "サンプル旧現場" },
  { id: "room-101", name: "サンプル集合住宅 101号室" },
  { id: "room-102", name: "サンプル集合住宅 102号室" },
];

const sharedAliases: AliasRecord[] = [
  { site_id: "room-101", alias: "サンプル集合住宅", source: "seed" },
  { site_id: "room-102", alias: "サンプル集合住宅", source: "seed" },
];

test("keeps an ambiguous pending photo unassigned and asks only for the full site name", async () => {
  const photo = storedEvent({
    id: "photo-awaiting",
    burst_id: "burst-awaiting",
    r2_key: "raw/group-test/photo-awaiting",
    content_type: "image/jpeg",
    action: "ask",
    state: "awaiting_confirmation",
  });
  const answer = storedEvent({
    id: "answer-ambiguous",
    text_content: "サンプル集合住宅",
    received_at: "2026-07-14T00:01:00.000Z",
  });
  const db = new MemoryDb([photo, answer], roomSites, sharedAliases);
  const replies: ReplyCall[] = [];

  const handled = await resolvePendingQuestion(
    { row: answer, replyToken: "reply-token" },
    db as SiteAnswerDb,
    replyRecorder(replies),
    () => Date.parse("2026-07-14T00:01:01.000Z"),
  );

  assert.equal(handled, true);
  assert.equal(photo.state, "awaiting_confirmation");
  assert.equal(photo.site_id, null);
  assert.equal(answer.state, "ignored");
  assert.equal(answer.error, "site_answer_ambiguous");
  assert.equal(db.resolutions.length, 0);
  assert.deepEqual(replies, [{
    templateId: "photo_ask",
    values: { count: 1 },
    token: "reply-token",
    eventIds: ["answer-ambiguous"],
    sourceId: "group-test",
  }]);
});

test("keeps an ambiguous correction pending, then applies a full formal-name answer", async () => {
  const photo = storedEvent({
    id: "photo-recorded",
    burst_id: "burst-recorded",
    r2_key: "raw/group-test/photo-recorded",
    content_type: "image/jpeg",
    site_id: "site-old",
    action: "assign",
    phase: "during",
    state: "recorded",
    reply_sent_at: "2026-07-14T00:00:00.000Z",
  });
  const correction = storedEvent({
    id: "correction-ambiguous",
    text_content: "訂正 サンプル集合住宅",
    received_at: "2026-07-14T00:05:00.000Z",
  });
  const db = new MemoryDb([photo, correction], roomSites, sharedAliases);
  db.recentPhotoId = photo.id;
  const replies: ReplyCall[] = [];

  const firstHandled = await resolveRecordedCorrection(
    { row: correction, replyToken: "reply-first" },
    db as SiteAnswerDb,
    replyRecorder(replies),
    () => Date.parse("2026-07-14T00:05:01.000Z"),
  );

  assert.equal(firstHandled, true);
  assert.equal(correction.state, "awaiting_confirmation");
  assert.equal(correction.burst_id, "burst-recorded");
  assert.equal(correction.site_id, "site-old");
  assert.equal(correction.action, "ask");
  assert.deepEqual(correction.candidates, ["room-101", "room-102"]);
  assert.equal(
    (photo as StoredLineEvent & { correction_open_until?: string }).correction_open_until,
    "2026-07-14T00:35:01.000Z",
  );
  assert.equal(db.resolutions.length, 0);
  assert.equal(replies[0]?.templateId, "photo_ask");

  const formalAnswer = storedEvent({
    id: "answer-formal",
    text_content: "サンプル集合住宅 102号室",
    received_at: "2026-07-14T00:06:00.000Z",
  });
  db.rows.push(formalAnswer);
  const secondHandled = await resolvePendingQuestion(
    { row: formalAnswer, replyToken: "reply-second" },
    db as SiteAnswerDb,
    replyRecorder(replies),
    () => Date.parse("2026-07-14T00:06:01.000Z"),
  );

  assert.equal(secondHandled, true);
  assert.equal(db.resolutions.length, 1);
  assert.deepEqual(db.resolutions[0], {
    answerEventId: "answer-formal",
    burstId: "burst-recorded",
    expectedState: "recorded",
    siteId: "room-102",
    newSiteName: null,
    observedAlias: "サンプル集合住宅 102号室",
    originalSiteId: "site-old",
    learnAlias: false,
    details: {
      answer: "サンプル集合住宅 102号室",
      burst_id: "burst-recorded",
      source: "confirmation_reply",
    },
  });
  assert.equal(replies[1]?.templateId, "correction_done");
  assert.deepEqual(replies[1]?.values, { site: "サンプル集合住宅 102号室" });
});
