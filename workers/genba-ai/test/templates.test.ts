import assert from "node:assert/strict";
import test from "node:test";
import { renderTemplateRecord, TemplateNotApprovedError } from "../src/services/templates";
import type { BotTemplate } from "../src/types";

const approved: BotTemplate = {
  template_id: "photo_auto",
  body: "Stored {count} items for {site}",
  variables: ["count", "site"],
  approved_at: "2026-01-01T00:00:00Z",
  approved_by: "approver",
};

test("renders only variables declared by an approved database template", () => {
  assert.equal(renderTemplateRecord(approved, { count: 2, site: "Sample" }), "Stored 2 items for Sample");
  assert.throws(() => renderTemplateRecord(approved, { count: 2 }), /Missing template variable/u);
});

test("rejects unapproved templates", () => {
  assert.throws(
    () => renderTemplateRecord({ ...approved, approved_at: null, approved_by: null }, { count: 1, site: "Sample" }),
    TemplateNotApprovedError,
  );
});

test("renders the approved creation confirmation without generating extra text", () => {
  const text = renderTemplateRecord({
    template_id: "create_confirm",
    body: "❓ 「{name}」を登録してよいですか？",
    variables: ["name"],
    approved_at: "2026-01-01T00:00:00Z",
    approved_by: "approver",
  }, { name: "Sample" });
  assert.equal(text, "❓ 「Sample」を登録してよいですか？");
});
