import { SupabaseClient } from "../clients/supabase";
import type { BotTemplate, Env, MatcherResult, SiteRecord, TemplateId } from "../types";

export class TemplateNotApprovedError extends Error {}

export function confirmationReplyFor(
  result: MatcherResult,
  sites: SiteRecord[],
): {
  templateId: "T-02" | "T-03";
  values: Record<string, string | number>;
} {
  const candidateSites = result.candidates
    .map((id) => sites.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is SiteRecord => Boolean(candidate));
  if (result.action === "ask_similar") {
    const existing = result.site_id
      ? sites.find((candidate) => candidate.id === result.site_id) ?? candidateSites[0]
      : candidateSites[0];
    if (existing) {
      return {
        templateId: "T-03",
        values: {
          新しい名前: result.new_site_name ?? "未確定",
          既存の現場名: existing.name,
        },
      };
    }
  }
  return {
    templateId: "T-02",
    values: {
      候補1: candidateSites[0]?.name ?? "",
      候補2: candidateSites[1]?.name ?? "",
      候補3: candidateSites[2]?.name ?? "",
    },
  };
}

async function sendLineText(
  path: "/v2/bot/message/reply" | "/v2/bot/message/push",
  payload: unknown,
  env: Env,
  retryKey?: string,
): Promise<void> {
  const response = await fetch(`${env.LINE_API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(retryKey ? { "X-Line-Retry-Key": retryKey } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok && !(retryKey && response.status === 409)) {
    throw new Error(`LINE template send failed: ${response.status}`);
  }
}

export function renderTemplateRecord(
  template: BotTemplate,
  values: Record<string, string | number>,
): string {
  if (!template.approved_at || !template.approved_by) {
    throw new TemplateNotApprovedError(`Template ${template.template_id} is not approved`);
  }
  let rendered = template.body;
  if (template.template_id === "T-02") {
    const variants = JSON.parse(template.body) as { with_candidates?: unknown; without_candidates?: unknown };
    const hasCandidates = ["候補1", "候補2", "候補3"].some((key) => String(values[key] ?? "") !== "");
    const selected = hasCandidates ? variants.with_candidates : variants.without_candidates;
    if (typeof selected !== "string" || selected.length === 0) {
      throw new Error("Approved T-02 body must contain both message variants");
    }
    rendered = selected;
  }
  for (const variable of template.variables) {
    if (!(variable in values)) throw new Error(`Missing template variable: ${variable}`);
    rendered = rendered.split(`{${variable}}`).join(String(values[variable]));
  }
  if (/\{[^{}]+\}/u.test(rendered)) throw new Error("Unresolved template variable remains");
  return rendered.replace(/（）/gu, "").replace(/[ \t]+\n/gu, "\n").trim();
}

export function renderWeeklyTemplateRecord(
  template: BotTemplate,
  rows: Array<{ 現場名: string; 枚数: number; 工程: string }>,
  values: Record<string, string | number>,
): string {
  if (template.template_id !== "T-06") throw new Error("Weekly renderer accepts only T-06");
  const sourceLines = template.body.split("\n");
  const repeatIndex = sourceLines.findIndex((line) => line.includes("{現場名}") && line.includes("{枚数}") && line.includes("{工程}"));
  if (repeatIndex < 0) throw new Error("T-06 repeat line was not found");
  const repeatLine = sourceLines[repeatIndex] ?? "";
  const expanded = rows.map((row) => repeatLine
    .split("{現場名}").join(row.現場名)
    .split("{枚数}").join(String(row.枚数))
    .split("{工程}").join(row.工程));
  const nextLine = sourceLines[repeatIndex + 1];
  const markerCount = nextLine?.includes("現場ぶん繰り返し") ? 1 : 0;
  sourceLines.splice(repeatIndex, 1 + markerCount, ...expanded);
  const remainingVariables = template.variables.filter((variable) => !["現場名", "枚数", "工程"].includes(variable));
  const rendered = renderTemplateRecord({ ...template, body: sourceLines.join("\n"), variables: remainingVariables }, values);
  return values["誤判定と訂正の要約"] === ""
    ? rendered.split("\n").filter((line) => !line.startsWith("【今週の学習】")).join("\n")
    : rendered;
}

async function approvedText(
  templateId: TemplateId,
  values: Record<string, string | number>,
  db: SupabaseClient,
): Promise<string> {
  const template = await db.getApprovedTemplate(templateId);
  if (!template) throw new TemplateNotApprovedError(`Template ${templateId} is not approved`);
  return renderTemplateRecord(template, values);
}

export async function replyWithTemplate(
  templateId: TemplateId,
  values: Record<string, string | number>,
  replyToken: string,
  db: SupabaseClient,
  env: Env,
): Promise<void> {
  const text = await approvedText(templateId, values, db);
  await sendLineText("/v2/bot/message/reply", {
    replyToken,
    messages: [{ type: "text", text }],
  }, env);
}

export async function pushWithTemplate(
  templateId: TemplateId,
  values: Record<string, string | number>,
  recipientId: string,
  db: SupabaseClient,
  env: Env,
  retryKey?: string,
): Promise<string> {
  const text = await approvedText(templateId, values, db);
  await sendLineText("/v2/bot/message/push", {
    to: recipientId,
    messages: [{ type: "text", text }],
  }, env, retryKey);
  return text;
}

export async function pushWeeklyWithTemplate(
  rows: Array<{ 現場名: string; 枚数: number; 工程: string }>,
  values: Record<string, string | number>,
  recipientId: string,
  retryKey: string,
  db: SupabaseClient,
  env: Env,
): Promise<string> {
  const template = await db.getApprovedTemplate("T-06");
  if (!template) throw new TemplateNotApprovedError("Template T-06 is not approved");
  const text = renderWeeklyTemplateRecord(template, rows, values);
  if (text.length > 2000) throw new Error("T-06 exceeds the Discord 2000-character limit");
  await sendLineText("/v2/bot/message/push", {
    to: recipientId,
    messages: [{ type: "text", text }],
  }, env, retryKey);
  return text;
}
