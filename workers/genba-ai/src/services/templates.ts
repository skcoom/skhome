import { SupabaseClient } from "../clients/supabase";
import type {
  BotTemplate,
  Env,
  GroupTemplateId,
  MatcherResult,
  PushTemplateId,
  SiteRecord,
  TemplateId,
} from "../types";

export class TemplateNotApprovedError extends Error {}

export function photoReplyFor(
  result: MatcherResult,
  sites: SiteRecord[],
  count: number,
): {
  templateId: "photo_auto" | "photo_ask" | "create_confirm";
  values: Record<string, string | number>;
} {
  if (result.action === "assign" && result.site_id) {
    const site = sites.find((candidate) => candidate.id === result.site_id);
    if (site) return { templateId: "photo_auto", values: { count, site: site.name } };
  }
  if (result.action === "create" && result.new_site_name) {
    return {
      templateId: "create_confirm",
      values: { name: result.new_site_name },
    };
  }
  return {
    templateId: "photo_ask",
    values: { count },
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
  templateId: GroupTemplateId,
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
  templateId: PushTemplateId,
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
