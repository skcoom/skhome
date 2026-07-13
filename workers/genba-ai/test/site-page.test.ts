import assert from "node:assert/strict";
import test from "node:test";
import { renderSitePage } from "../src/services/site-page";

test("renders a mobile page with tokenized media, phase tabs and noindex", () => {
  const html = renderSitePage(
    { id: "site-1", name: "サンプル現場" },
    [{ id: "media-1", phase: "before", r2_key: "raw/group/photo", caption: null, created_at: "2026-01-01T00:00:00Z" }],
    [{ id: "progress-1", date: "2026-01-01", description: "着工", created_at: "2026-01-01T00:00:00Z" }],
    "token",
    "all",
  );
  assert.match(html, /noindex,nofollow,noarchive/u);
  assert.match(html, /phase=before/u);
  assert.match(html, /\/media\/raw%2Fgroup%2Fphoto\?token=token/u);
  assert.doesNotMatch(html, /<script/u);
});

test("escapes site and progress text", () => {
  const html = renderSitePage(
    { id: "site-1", name: "<sample>" },
    [],
    [{ id: "progress-1", date: "2026-01-01", description: "<script>", created_at: "2026-01-01T00:00:00Z" }],
    "token",
    "all",
  );
  assert.doesNotMatch(html, /<script>/u);
  assert.match(html, /&lt;script&gt;/u);
});
