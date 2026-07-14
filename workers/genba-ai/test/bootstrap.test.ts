import assert from "node:assert/strict";
import test from "node:test";
import bootstrap from "../src/bootstrap";

test("bootstrap Worker exposes only a fail-closed readiness response", async () => {
  const response = bootstrap.fetch();
  const body = await response.json() as { ok?: unknown; service?: unknown; ready?: unknown };
  assert.equal(response.status, 503);
  assert.deepEqual(body, { ok: false, service: "genba-ai-bootstrap", ready: false });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/u);
});
