import assert from "node:assert/strict";
import test from "node:test";
import { bearerToken, handleAdminMedia } from "../src/services/admin-media";
import type { Env } from "../src/types";

test("accepts only a strict bearer authorization header", () => {
  assert.equal(bearerToken(new Request("https://example.test", {
    headers: { Authorization: "Bearer valid-token" },
  })), "valid-token");
  assert.equal(bearerToken(new Request("https://example.test", {
    headers: { Authorization: "Basic abc" },
  })), null);
  assert.equal(bearerToken(new Request("https://example.test", {
    headers: { Authorization: "Bearer token with spaces" },
  })), null);
});

test("does not accept a missing authorization header", () => {
  assert.equal(bearerToken(new Request("https://example.test")), null);
});

test("streams a private R2 object only for an authenticated staff user", async () => {
  const originalFetch = globalThis.fetch;
  let r2Reads = 0;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith("/auth/v1/user")) return Response.json({ id: "staff-user" });
    if (url.includes("/rest/v1/users?")) return Response.json([{ role: "staff" }]);
    if (url.includes("/rest/v1/line_events?")) {
      return Response.json([{
        id: "11111111-1111-4111-8111-111111111111",
        r2_key: "raw/private-photo",
        content_type: "image/jpeg",
        site_id: "22222222-2222-4222-8222-222222222222",
        state: "recorded",
      }]);
    }
    throw new Error(`Unexpected request: ${url}`);
  }) as typeof fetch;

  const env = {
    SUPABASE_URL: "https://supabase.example.test",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
    PHOTOS: {
      get: async (key: string) => {
        r2Reads += 1;
        assert.equal(key, "raw/private-photo");
        return {
          body: new Uint8Array([1, 2, 3]),
          httpMetadata: { contentType: "image/jpeg" },
          httpEtag: '"private-etag"',
        };
      },
    },
  } as unknown as Env;

  try {
    const response = await handleAdminMedia(new Request("https://worker.example.test/admin/media/11111111-1111-4111-8111-111111111111", {
      headers: { Authorization: "Bearer user-access-token" },
    }), "11111111-1111-4111-8111-111111111111", env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow, noarchive");
    assert.equal(response.headers.get("Content-Type"), "image/jpeg");
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3]));
    assert.equal(r2Reads, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects a partner before reading R2", async () => {
  const originalFetch = globalThis.fetch;
  let r2Reads = 0;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith("/auth/v1/user")) return Response.json({ id: "partner-user" });
    if (url.includes("/rest/v1/users?")) return Response.json([{ role: "partner" }]);
    throw new Error(`Unexpected request: ${url}`);
  }) as typeof fetch;

  const env = {
    SUPABASE_URL: "https://supabase.example.test",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
    PHOTOS: { get: async () => { r2Reads += 1; return null; } },
  } as unknown as Env;

  try {
    const response = await handleAdminMedia(new Request("https://worker.example.test/admin/media/11111111-1111-4111-8111-111111111111", {
      headers: { Authorization: "Bearer partner-access-token" },
    }), "11111111-1111-4111-8111-111111111111", env);
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.equal(r2Reads, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
