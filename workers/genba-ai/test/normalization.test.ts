import assert from "node:assert/strict";
import test from "node:test";
import { extractSiteName, normalizeSiteText } from "../src/engine/normalization";

test("normalizes spacing, floor notation, roman numerals and renovation spelling", () => {
  assert.equal(normalizeSiteText(" サンプル 6階 Ⅱ リホーム "), "サンプル6f2リフォーム");
  assert.equal(normalizeSiteText("サンプル6F2リフォーム"), "サンプル6f2リフォーム");
});

test("removes date prefixes and progress suffixes from a new site name", () => {
  assert.equal(extractSiteName("20260706サンプル邸 はじめます"), "サンプル邸");
});
