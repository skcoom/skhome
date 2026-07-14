import assert from "node:assert/strict";
import test from "node:test";
import {
  bareSiteNameAnswer,
  explicitCorrectionTarget,
  isAffirmativeAnswer,
  isNegativeAnswer,
  pendingSiteNameAnswer,
} from "../src/services/answers";
import { burstIdWithoutSender } from "../src/services/burst";
import {
  resolveSiteAnswer,
  siteNameWithoutPendingError,
} from "../src/services/site-answer";
import { photoReplyFor } from "../src/services/templates";
import type { AliasRecord, MatcherResult, SiteRecord } from "../src/types";

const sites: SiteRecord[] = [
  { id: "site-a", name: "サンプル現場A" },
  { id: "site-b", name: "サンプル現場B" },
];

function result(overrides: Partial<MatcherResult>): MatcherResult {
  return {
    action: "ask",
    candidates: [],
    phase: "unknown",
    confidence: 0.7,
    reasoning: "test",
    ...overrides,
  };
}

test("maps an assigned photo to photo_auto", () => {
  const reply = photoReplyFor(result({ action: "assign", site_id: "site-a" }), sites, 2);
  assert.equal(reply.templateId, "photo_auto");
  assert.deepEqual(reply.values, { count: 2, site: "サンプル現場A" });
});

test("does not expose internal candidates in an ambiguous photo reply", () => {
  const reply = photoReplyFor(result({ candidates: ["site-a", "site-b"] }), sites, 3);
  assert.equal(reply.templateId, "photo_ask");
  assert.deepEqual(reply.values, { count: 3 });
});

test("maps a similar-site result to the same neutral photo question", () => {
  const reply = photoReplyFor(result({
    action: "ask_similar",
    site_id: "site-a",
    new_site_name: "サンプル現場A別表記",
    candidates: ["site-a"],
  }), sites, 1);
  assert.equal(reply.templateId, "photo_ask");
  assert.deepEqual(reply.values, { count: 1 });
});

test("requires confirmation before creating an unknown site", () => {
  const reply = photoReplyFor(result({
    action: "create",
    new_site_name: "サンプル現場C",
  }), sites, 1);
  assert.equal(reply.templateId, "create_confirm");
  assert.deepEqual(reply.values, { name: "サンプル現場C" });
});

test("accepts only an explicit correction command", () => {
  assert.equal(explicitCorrectionTarget("訂正 サンプル現場B"), "サンプル現場B");
  assert.equal(explicitCorrectionTarget("サンプル現場B"), null);
  assert.equal(explicitCorrectionTarget("訂正 A"), null);
});

test("accepts only exact creation confirmation or cancellation answers", () => {
  assert.equal(isAffirmativeAnswer(" はい "), true);
  assert.equal(isAffirmativeAnswer("はい、お願いします"), false);
  assert.equal(isNegativeAnswer("いいえ"), true);
  assert.equal(isNegativeAnswer("キャンセル"), true);
});

test("does not mistake a progress report for a bare site-name reply", () => {
  assert.equal(bareSiteNameAnswer("サンプル現場A"), "サンプル現場A");
  assert.equal(bareSiteNameAnswer("サンプル現場A 完了です"), null);
  assert.equal(bareSiteNameAnswer("サンプル現場A 着工します"), null);
  assert.equal(pendingSiteNameAnswer("サンプル現場A 完了です"), "サンプル現場A");
});

test("does not group images from an unknown sender", () => {
  assert.notEqual(
    burstIdWithoutSender("group-test", "message-a"),
    burstIdWithoutSender("group-test", "message-b"),
  );
});

test("resolves one exact formal site name", () => {
  const answer = resolveSiteAnswer("サンプル現場A", sites, []);
  assert.equal(answer.kind, "resolved");
  if (answer.kind === "resolved") assert.equal(answer.site.id, "site-a");
});

test("resolves an alias that belongs to one site", () => {
  const aliases: AliasRecord[] = [
    { site_id: "site-b", alias: "現場B略称", source: "manual" },
  ];
  const answer = resolveSiteAnswer("現場B略称", sites, aliases);
  assert.equal(answer.kind, "resolved");
  if (answer.kind === "resolved") assert.equal(answer.site.id, "site-b");
});

test("does not resolve an alias shared by multiple room sites", () => {
  const roomSites: SiteRecord[] = [
    { id: "room-101", name: "サンプル集合住宅 101号室" },
    { id: "room-102", name: "サンプル集合住宅 102号室" },
  ];
  const aliases: AliasRecord[] = [
    { site_id: "room-101", alias: "サンプル集合住宅", source: "seed" },
    { site_id: "room-102", alias: "サンプル集合住宅", source: "seed" },
  ];
  const answer = resolveSiteAnswer("サンプル集合住宅", roomSites, aliases);
  assert.equal(answer.kind, "ambiguous");
  if (answer.kind === "ambiguous") {
    assert.deepEqual(answer.candidates.map((site) => site.id), ["room-101", "room-102"]);
  }
});

test("does not resolve duplicate normalized formal site names", () => {
  const duplicateSites: SiteRecord[] = [
    { id: "formal-a", name: "サンプル現場 3階" },
    { id: "formal-b", name: "サンプル現場 3F" },
  ];
  const answer = resolveSiteAnswer("サンプル現場 3階", duplicateSites, []);
  assert.equal(answer.kind, "ambiguous");
  if (answer.kind === "ambiguous") {
    assert.deepEqual(answer.candidates.map((site) => site.id), ["formal-a", "formal-b"]);
  }
});

test("blocks a bare shared alias from becoming a progress record", () => {
  const roomSites: SiteRecord[] = [
    { id: "room-201", name: "サンプル共同住宅 201号室" },
    { id: "room-202", name: "サンプル共同住宅 202号室" },
  ];
  const aliases: AliasRecord[] = [
    { site_id: "room-201", alias: "サンプル共同住宅", source: "seed" },
    { site_id: "room-202", alias: "サンプル共同住宅", source: "seed" },
  ];
  assert.equal(
    siteNameWithoutPendingError("サンプル共同住宅", roomSites, aliases),
    "site_answer_ambiguous",
  );
  assert.equal(
    siteNameWithoutPendingError("サンプル共同住宅 201号室", roomSites, aliases),
    "site_name_without_pending_question",
  );
  assert.equal(
    siteNameWithoutPendingError("サンプル共同住宅 201号室 完了です", roomSites, aliases),
    null,
  );
});
