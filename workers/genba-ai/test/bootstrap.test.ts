import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import bootstrap from "../src/bootstrap";

const requiredSecrets = [
  "LINE_CHANNEL_SECRET",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "LINE_SUMMARY_USER_ID",
] as const;

test("bootstrap Worker exposes only a fail-closed readiness response", async () => {
  const response = bootstrap.fetch();
  const body = await response.json() as { ok?: unknown; service?: unknown; ready?: unknown };
  assert.equal(response.status, 503);
  assert.deepEqual(body, { ok: false, service: "genba-ai-bootstrap", ready: false });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/u);
});

test("production deploy requires all secrets while bootstrap accepts staged entry", async () => {
  const [productionConfig, bootstrapConfig] = await Promise.all([
    readFile(new URL("../wrangler.toml", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.bootstrap.toml", import.meta.url), "utf8"),
  ]);
  assert.match(productionConfig, /^\[secrets\]$/mu);
  for (const secret of requiredSecrets) assert.match(productionConfig, new RegExp(`"${secret}"`, "u"));
  assert.doesNotMatch(bootstrapConfig, /^\[secrets\]$/mu);
});
