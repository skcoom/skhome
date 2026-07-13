import assert from "node:assert/strict";
import test from "node:test";
import { burstIdWithoutSender } from "../src/services/burst";
import { confirmationReplyFor } from "../src/services/templates";
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

test("maps an ambiguous result to the approved T-02 candidate template", () => {
  const reply = confirmationReplyFor(result({ candidates: ["site-a", "site-b"] }), sites);
  assert.equal(reply.templateId, "T-02");
  assert.deepEqual(reply.values, {
    候補1: "サンプル現場A",
    候補2: "サンプル現場B",
    候補3: "",
  });
});

test("maps a similar-site result to the approved T-03 template", () => {
  const reply = confirmationReplyFor(result({
    action: "ask_similar",
    site_id: "site-a",
    new_site_name: "サンプル現場A別表記",
    candidates: ["site-a"],
  }), sites);
  assert.equal(reply.templateId, "T-03");
  assert.deepEqual(reply.values, {
    新しい名前: "サンプル現場A別表記",
    既存の現場名: "サンプル現場A",
  });
});

test("does not group images from an unknown sender", () => {
  assert.notEqual(
    burstIdWithoutSender("group-test", "message-a"),
    burstIdWithoutSender("group-test", "message-b"),
  );
});
