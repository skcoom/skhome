import assert from "node:assert/strict";
import test from "node:test";
import { createSiteToken, verifySiteToken } from "../src/security/site-token";

test("site tokens are signed and tamper evident", async () => {
  const siteId = "123e4567-e89b-42d3-a456-426614174000";
  const token = await createSiteToken(siteId, "test-secret");
  assert.equal(await verifySiteToken(token, "test-secret"), siteId);
  assert.equal(await verifySiteToken(`${token.slice(0, -1)}x`, "test-secret"), null);
  assert.equal(await verifySiteToken(token, "different-secret"), null);
});
