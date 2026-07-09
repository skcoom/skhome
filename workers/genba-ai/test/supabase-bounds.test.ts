import assert from "node:assert/strict";
import test from "node:test";
import { SupabaseClient } from "../src/clients/supabase";
import type { Env } from "../src/types";

test("all event-history lookups are bounded by the event timestamp", async () => {
  const requested: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    requested.push(String(input));
    return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const db = new SupabaseClient({
      SUPABASE_URL: "https://example.invalid",
      SUPABASE_SERVICE_ROLE_KEY: "test-key",
    } as Env);
    const since = "2026-07-10T00:00:00.000Z";
    const until = "2026-07-10T01:00:00.000Z";
    await db.findRecentBurst("group", "sender", since, until);
    await db.getSenderContext("sender", since, until);
    await db.getGroupContext("group", since, until);
    await db.findRecentRecordedPhoto("group", since, until);
    assert.equal(requested.length, 4);
    for (const url of requested) {
      assert.match(url, /received_at=lte\.2026-07-10T01%3A00%3A00\.000Z/u);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
