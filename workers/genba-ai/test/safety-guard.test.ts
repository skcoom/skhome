import assert from "node:assert/strict";
import test from "node:test";
import { applyConservativeGuard } from "../src/engine/safety-guard";
import type { MatchContext, MatcherResult } from "../src/types";

function context(text: string, images = 1): MatchContext {
  return {
    event: { sender: "担当者", text, images },
    sender_context: [],
    group_context: [],
    sites: [{ id: "site-101", name: "サンプル邸101" }],
    aliases: [],
  };
}

function aiAssign(): MatcherResult {
  return {
    action: "assign",
    site_id: "site-101",
    site_name: "サンプル邸101",
    candidates: [],
    phase: "during",
    confidence: 0.95,
    reasoning: "AI result",
  };
}

test("does not assign an existing room when deterministic matching detects a new room", () => {
  assert.equal(applyConservativeGuard(context("サンプル邸102"), aiAssign()).action, "ask");
});

test("does not let an AI assignment override a deterministic non-work message", () => {
  assert.equal(applyConservativeGuard(context("お疲れ様です", 0), aiAssign()).action, "ignore");
});

test("uses a learned database alias in the deterministic safety layer", () => {
  const matchContext = context("新しい呼び方");
  matchContext.aliases = [{
    site_id: matchContext.sites[0]!.id,
    site_name: matchContext.sites[0]!.name,
    alias: "新しい呼び方",
    source: "correction",
  }];
  const result = applyConservativeGuard(matchContext, {
    action: "assign",
    site_id: matchContext.sites[0]!.id,
    site_name: matchContext.sites[0]!.name,
    candidates: [],
    phase: "during",
    confidence: 0.93,
    reasoning: "learned alias",
  });
  assert.equal(result.action, "assign");
  assert.equal(result.site_id, matchContext.sites[0]!.id);
});
