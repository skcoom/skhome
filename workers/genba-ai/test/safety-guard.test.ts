import assert from "node:assert/strict";
import test from "node:test";
import { matchDeterministically } from "../src/engine/deterministic-matcher";
import { applyConservativeGuard, mergeAliasDictionary } from "../src/engine/safety-guard";
import type { AliasDictionary } from "../src/engine/normalization";
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
  assert.equal(applyConservativeGuard(context("サンプル邸102"), aiAssign(), true).action, "ask");
});

test("does not let an AI assignment override a deterministic non-work message", () => {
  assert.equal(applyConservativeGuard(context("お疲れ様です", 0), aiAssign(), false).action, "ignore");
});

test("keeps a high-confidence vision ignore for an image-only non-work post", () => {
  const matchContext = context("", 1);
  matchContext.event.text = null;
  matchContext.sender_context = [{
    site_id: "site-101",
    site: "サンプル邸101",
    when: "2026-01-01T00:00:00Z",
    text: null,
  }];
  const result = applyConservativeGuard(matchContext, {
    action: "ignore",
    candidates: [],
    phase: "unknown",
    confidence: 0.96,
    reasoning: "画像は工事と無関係",
  }, true);
  assert.equal(result.action, "ignore");
});

test("does not trust a vision ignore when no image reached Claude", () => {
  const matchContext = context("", 1);
  matchContext.event.text = null;
  const result = applyConservativeGuard(matchContext, {
    action: "ignore",
    candidates: [],
    phase: "unknown",
    confidence: 0.96,
    reasoning: "画像は工事と無関係",
  }, false);
  assert.equal(result.action, "ask");
});

test("does not trust a vision ignore when only part of a burst reached Claude", () => {
  const matchContext = context("", 2);
  matchContext.event.text = null;
  matchContext.sender_context = [{
    site_id: "site-101",
    site: "サンプル邸101",
    when: "2026-01-01T00:00:00Z",
    text: null,
  }];
  const result = applyConservativeGuard(matchContext, {
    action: "ignore",
    candidates: [],
    phase: "unknown",
    confidence: 0.96,
    reasoning: "画像は工事と無関係",
  }, false);
  assert.equal(result.action, "ask");
});

test("carries the observed new name into an alias confirmation", () => {
  const dictionary: AliasDictionary = {
    clusters: [{
      canonical: "サンプル邸101",
      aliases: ["サンプル"],
      type: "property",
      note: "同一現場の表記ゆれ",
    }],
  };
  const result = matchDeterministically(
    { sender: "担当者", text: "サンプル 101", images: 1 },
    [{ id: "site-101", name: "サンプル邸101" }],
    dictionary,
  );
  assert.equal(result.action, "ask_similar");
  assert.equal(result.new_site_name, "サンプル 101");
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
  }, true);
  assert.equal(result.action, "assign");
  assert.equal(result.site_id, matchContext.sites[0]!.id);
});

test("keeps a static caution cluster ahead of broad seeded aliases", () => {
  const matchContext: MatchContext = {
    event: { sender: "担当者", text: "注意 101", images: 1 },
    sender_context: [],
    group_context: [],
    sites: [
      { id: "site-101", name: "注意物件A101" },
      { id: "site-201", name: "注意物件B201" },
    ],
    aliases: [
      { site_id: "site-101", alias: "注意", source: "initial:caution" },
      { site_id: "site-201", alias: "注意", source: "initial:caution" },
    ],
  };
  const base: AliasDictionary = {
    clusters: [{ canonical: "注意物件", aliases: ["注意"], type: "caution" }],
  };
  const dictionary = mergeAliasDictionary(matchContext, base);
  const result = matchDeterministically({
    sender: "担当者",
    text: matchContext.event.text,
    images: 1,
  }, matchContext.sites, dictionary);
  assert.equal(dictionary.clusters[0]?.type, "caution");
  assert.equal(result.action, "ask");
});
