import assert from "node:assert/strict";
import test from "node:test";
import { renderTemplateRecord, TemplateNotApprovedError } from "../src/services/templates";
import type { BotTemplate } from "../src/types";

const approved: BotTemplate = {
  template_id: "T-01",
  body: "Stored {count} items（{phase}）",
  variables: ["count", "phase"],
  approved_at: "2026-01-01T00:00:00Z",
  approved_by: "approver",
};

test("renders only variables declared by an approved database template", () => {
  assert.equal(renderTemplateRecord(approved, { count: 2, phase: "" }), "Stored 2 items");
  assert.throws(() => renderTemplateRecord(approved, { count: 2 }), /Missing template variable/u);
});

test("rejects unapproved templates", () => {
  assert.throws(
    () => renderTemplateRecord({ ...approved, approved_at: null, approved_by: null }, { count: 1, phase: "" }),
    TemplateNotApprovedError,
  );
});

test("uses the approved no-candidate T-02 variant without dash placeholders", () => {
  const text = renderTemplateRecord({
    template_id: "T-02",
    body: JSON.stringify({
      with_candidates: "❓ この写真はどの現場ですか？\n候補: ①{候補1} ②{候補2} ③{候補3}\n番号か現場名で返信してください",
      without_candidates: "❓ この写真はどの現場ですか？\n現場名を返信してください",
    }),
    variables: ["候補1", "候補2", "候補3"],
    approved_at: "2026-01-01T00:00:00Z",
    approved_by: "approver",
  }, { 候補1: "", 候補2: "", 候補3: "" });
  assert.equal(text, "❓ この写真はどの現場ですか？\n現場名を返信してください");
});
