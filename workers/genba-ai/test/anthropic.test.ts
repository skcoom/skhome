import assert from "node:assert/strict";
import test from "node:test";
import {
  canAddVisionImage,
  MAX_VISION_IMAGE_BYTES,
  MAX_VISION_TOTAL_BYTES,
} from "../src/clients/anthropic";

test("keeps a Claude vision request within per-image, count, and total budgets", () => {
  assert.equal(canAddVisionImage(0, MAX_VISION_IMAGE_BYTES, 0), true);
  assert.equal(canAddVisionImage(0, MAX_VISION_IMAGE_BYTES + 1, 0), false);
  assert.equal(canAddVisionImage(MAX_VISION_TOTAL_BYTES - 10, 11, 1), false);
  assert.equal(canAddVisionImage(0, 1, 10), false);
});
