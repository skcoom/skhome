import assert from "node:assert/strict";
import test from "node:test";
import { verifySiteToken } from "../src/security/site-token";
import { renderWeeklyTemplateRecord } from "../src/services/templates";
import {
  createWeeklyToken,
  renderWeeklyPage,
  summarizeWeeklyData,
  verifyWeeklyToken,
} from "../src/services/weekly";
import type { BotTemplate } from "../src/types";

test("extracts moved, completion and seven-day stalled sites", () => {
  const summary = summarizeWeeklyData(
    new Date("2026-01-12T08:00:00+09:00"),
    [
      { id: "active", name: "サンプルA", status: "in_progress", last_line_activity_at: "2026-01-10T00:00:00Z" },
      { id: "stalled", name: "サンプルB", status: "in_progress", last_line_activity_at: "2026-01-04T15:00:00Z" },
    ],
    [{ project_id: "active", phase: "after", created_at: "2026-01-10T00:00:00Z" }],
    [],
    [],
  );
  assert.equal(summary.moved[0]?.count, 1);
  assert.equal(summary.completionCandidates[0]?.id, "active");
  assert.equal(summary.stalled[0]?.id, "stalled");
});

test("includes a text-only after report as a completion candidate", () => {
  const summary = summarizeWeeklyData(
    new Date("2026-01-12T08:00:00+09:00"),
    [{ id: "text-complete", name: "サンプルC", status: "in_progress" }],
    [],
    [{ site_id: "text-complete" }],
    [],
  );
  assert.equal(summary.moved.length, 0);
  assert.equal(summary.completionCandidates[0]?.id, "text-complete");
});

test("does not call a new site stalled before seven days without LINE activity", () => {
  const summary = summarizeWeeklyData(
    new Date("2026-01-12T08:00:00+09:00"),
    [
      { id: "new", name: "サンプルD", status: "in_progress", created_at: "2026-01-10T00:00:00Z" },
      { id: "old", name: "サンプルE", status: "planning", created_at: "2026-01-04T14:59:59Z" },
    ],
    [],
    [],
    [],
  );
  assert.deepEqual(summary.stalled.map((site) => site.id), ["old"]);
});

test("expands only the approved T-06 repeat line", () => {
  const template: BotTemplate = {
    template_id: "T-06",
    body: "Report {period}\n・{現場名} +{枚数}（{工程}）\n（…現場ぶん繰り返し）\nLearning {learning}",
    variables: ["period", "現場名", "枚数", "工程", "learning"],
    approved_at: "2026-01-01T00:00:00Z",
    approved_by: "approver",
  };
  const text = renderWeeklyTemplateRecord(template, [
    { 現場名: "A", 枚数: 2, 工程: "施工中" },
    { 現場名: "B", 枚数: 1, 工程: "施工後" },
  ], { period: "1/1-1/7", learning: "none" });
  assert.match(text, /・A \+2（施工中）\n・B \+1（施工後）/u);
  assert.doesNotMatch(text, /繰り返し/u);
});

test("weekly report token is signed and tamper evident", async () => {
  const start = new Date("2026-01-05T00:00:00+09:00");
  const token = await createWeeklyToken(start, "test-secret");
  assert.ok(await verifyWeeklyToken(token, "test-secret"));
  assert.equal(await verifyWeeklyToken(`${token}x`, "test-secret"), null);
});

test("weekly page links each listed site to its signed site page", async () => {
  const site = {
    id: "123e4567-e89b-42d3-a456-426614174000",
    name: "サンプル現場",
    status: "in_progress",
  };
  const html = await renderWeeklyPage({
    start: new Date("2026-01-05T00:00:00+09:00"),
    end: new Date("2026-01-12T00:00:00+09:00"),
    moved: [{ site, count: 2, phases: ["during"] }],
    completionCandidates: [site],
    stalled: [site],
    learning: [],
  }, "https://worker.example", "test-secret");
  const href = html.match(/href="(https:\/\/worker\.example\/sites\/[^"]+)"/u)?.[1];
  assert.ok(href);
  const token = decodeURIComponent(new URL(href).pathname.slice("/sites/".length));
  assert.equal(await verifySiteToken(token, "test-secret"), site.id);
  assert.equal((html.match(/>サンプル現場<\/a>/gu) ?? []).length, 3);
  assert.match(html, /noindex,nofollow,noarchive/u);
});
