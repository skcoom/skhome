import assert from "node:assert/strict";
import test from "node:test";
import { verifyLineSignature } from "../src/security/signature";

test("accepts the LINE documentation signature vector", async () => {
  const body = '{"destination":"U8e742f61d673b39c7fff3cecb7536ef0","events":[]}';
  const valid = await verifyLineSignature(
    body,
    "GhRKmvmHys4Pi8DxkF4+EayaH0OqtJtaZxgTD9fMDLs=",
    "8c570fa6dd201bb328f1c1eac23a96d8",
  );
  assert.equal(valid, true);
});

test("rejects a modified body and malformed signatures", async () => {
  const valid = await verifyLineSignature(
    '{"events":[]}',
    "GhRKmvmHys4Pi8DxkF4+EayaH0OqtJtaZxgTD9fMDLs=",
    "8c570fa6dd201bb328f1c1eac23a96d8",
  );
  assert.equal(valid, false);
  assert.equal(await verifyLineSignature("{}", "not-base64", "secret"), false);
  assert.equal(await verifyLineSignature("{}", null, "secret"), false);
});
