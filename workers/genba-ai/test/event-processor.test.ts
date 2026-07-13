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
import { photoReplyFor } from "../src/services/templates";
import type { MatcherResult, SiteRecord } from "../src/types";

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
