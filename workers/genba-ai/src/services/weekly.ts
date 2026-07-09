import { SupabaseClient } from "../clients/supabase";
import type { Env, MediaPhase, SiteRecord } from "../types";
import { pushWeeklyWithTemplate } from "./templates";

interface WeeklyMediaRow {
  project_id: string;
  phase: "before" | "during" | "after";
  created_at: string;
}

interface CorrectionRow {
  original_site_id: string | null;
  site_id: string | null;
  observed_alias: string | null;
  normalized_alias: string | null;
  log_type: "correction" | "normalization_hit";
  created_at: string;
}

export interface WeeklySummary {
  start: Date;
  end: Date;
  moved: Array<{ site: SiteRecord; count: number; phases: MediaPhase[] }>;
  completionCandidates: SiteRecord[];
  stalled: SiteRecord[];
  learning: string[];
}

function startOfJstDay(date: Date): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = new Map(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const year = Number(parts.get("year"));
  const month = Number(parts.get("month"));
  const day = Number(parts.get("day"));
  return new Date(Date.UTC(year, month - 1, day) - 9 * 3_600_000);
}

export function summarizeWeeklyData(
  scheduledAt: Date,
  sites: SiteRecord[],
  media: WeeklyMediaRow[],
  corrections: CorrectionRow[],
): WeeklySummary {
  const end = startOfJstDay(scheduledAt);
  const start = new Date(end.getTime() - 7 * 24 * 3_600_000);
  const siteById = new Map(sites.map((site) => [site.id, site]));
  const grouped = new Map<string, WeeklyMediaRow[]>();
  for (const row of media) grouped.set(row.project_id, [...(grouped.get(row.project_id) ?? []), row]);
  const moved = [...grouped.entries()].flatMap(([siteId, rows]) => {
    const site = siteById.get(siteId);
    if (!site) return [];
    return [{
      site,
      count: rows.length,
      phases: [...new Set(rows.map((row) => row.phase))],
    }];
  }).sort((left, right) => right.count - left.count);
  const completionCandidates = moved.filter((item) => item.phases.includes("after")).map((item) => item.site);
  const stalledCutoff = end.getTime() - 7 * 24 * 3_600_000;
  const stalled = sites.filter((site) =>
    (site.status === "planning" || site.status === "in_progress")
    && (!site.last_line_activity_at || new Date(site.last_line_activity_at).getTime() <= stalledCutoff),
  );
  const learning = corrections.flatMap((correction) => {
    const site = correction.site_id ? siteById.get(correction.site_id) : undefined;
    if (correction.observed_alias && site) return [`${correction.observed_alias}→${site.name}`];
    if (correction.log_type === "normalization_hit" && correction.normalized_alias) return [correction.normalized_alias];
    return [];
  });
  return { start, end, moved, completionCandidates, stalled, learning };
}

function dateShort(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" }).format(date);
}

function phaseSummary(phases: MediaPhase[]): string {
  return phases.map((phase) => phase === "before" ? "施工前" : phase === "after" ? "施工後" : "施工中").join("/");
}

async function hmacToken(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

async function weeklyRetryKey(start: Date, secret: string): Promise<string> {
  const value = start.toISOString().slice(0, 10);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`weekly:${value}`))).slice(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function createWeeklyToken(start: Date, secret: string): Promise<string> {
  const date = start.toISOString().slice(0, 10);
  return `${date}.${await hmacToken(date, secret)}`;
}

export async function verifyWeeklyToken(token: string, secret: string): Promise<Date | null> {
  const match = token.match(/^(\d{4}-\d{2}-\d{2})\.([A-Za-z0-9_-]+)$/u);
  if (!match?.[1] || !match[2]) return null;
  const expected = await hmacToken(match[1], secret);
  if (expected.length !== match[2].length) return null;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ match[2].charCodeAt(index);
  }
  return difference === 0 ? new Date(`${match[1]}T00:00:00+09:00`) : null;
}

async function loadSummary(scheduledAt: Date, db: SupabaseClient): Promise<WeeklySummary> {
  const end = startOfJstDay(scheduledAt);
  const start = new Date(end.getTime() - 7 * 24 * 3_600_000);
  const [sites, media, corrections] = await Promise.all([
    db.getAllSites(),
    db.getWeeklyMedia(start.toISOString(), end.toISOString()),
    db.getCorrections(start.toISOString(), end.toISOString()),
  ]);
  return summarizeWeeklyData(scheduledAt, sites, media, corrections);
}

function weeklyValues(summary: WeeklySummary, reportUrl: string): {
  rows: Array<{ 現場名: string; 枚数: number; 工程: string }>;
  values: Record<string, string | number>;
} {
  return {
    rows: summary.moved.slice(0, 12).map((item) => ({
      現場名: item.site.name,
      枚数: item.count,
      工程: phaseSummary(item.phases),
    })),
    values: {
      期間: `${dateShort(summary.start)}〜${dateShort(new Date(summary.end.getTime() - 1))}`,
      n: summary.moved.length,
      完工候補: summary.completionCandidates.slice(0, 12).map((site) => site.name).join("、") || "なし",
      日数: 7,
      停滞現場: summary.stalled.slice(0, 12).map((site) => site.name).join("、") || "なし",
      "誤判定と訂正の要約": summary.learning.slice(0, 10).join("、"),
      週報ページURL: reportUrl,
    },
  };
}

async function postDiscord(text: string, env: Env): Promise<void> {
  const response = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Discord webhook failed: ${response.status}`);
}

export async function runWeeklySummary(env: Env, scheduledTime: number): Promise<void> {
  if (env.TEST_MODE === "true") return;
  const db = new SupabaseClient(env);
  const summary = await loadSummary(new Date(scheduledTime), db);
  const token = await createWeeklyToken(summary.start, env.LINE_CHANNEL_SECRET);
  const reportUrl = `${env.PUBLIC_BASE_URL}/weekly/${token}`;
  const { rows, values } = weeklyValues(summary, reportUrl);
  const retryKey = await weeklyRetryKey(summary.start, env.LINE_CHANNEL_SECRET);
  const text = await pushWeeklyWithTemplate(rows, values, env.LINE_SUMMARY_USER_ID, retryKey, db, env);
  await postDiscord(text, env);
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export async function handleWeeklyPage(token: string, env: Env): Promise<Response> {
  const start = await verifyWeeklyToken(token, env.LINE_CHANNEL_SECRET);
  if (!start) return new Response("Not found", { status: 404 });
  const db = new SupabaseClient(env);
  const summary = await loadSummary(new Date(start.getTime() + 7 * 24 * 3_600_000), db);
  const moved = summary.moved.map((item) => `<li><strong>${escapeHtml(item.site.name)}</strong><span>+${item.count}枚・${escapeHtml(phaseSummary(item.phases))}</span></li>`).join("");
  const completed = summary.completionCandidates.map((site) => `<li>${escapeHtml(site.name)}</li>`).join("");
  const stalled = summary.stalled.map((site) => `<li>${escapeHtml(site.name)}</li>`).join("");
  const learning = summary.learning.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>現場週報</title><style>body{max-width:760px;margin:auto;padding:24px 16px 48px;background:#f8fafc;color:#172033;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif}h1{font-size:1.35rem}section{margin:14px 0;padding:16px;border-radius:12px;background:#fff;box-shadow:0 1px 4px #0f172a12}h2{margin-top:0;font-size:1rem}ul{padding-left:20px}li{margin:8px 0}li span{display:block;color:#64748b;font-size:.8rem}</style></head><body><h1>現場週報</h1><p>${dateShort(summary.start)}〜${dateShort(new Date(summary.end.getTime() - 1))}</p><section><h2>動いた現場</h2><ul>${moved || "<li>なし</li>"}</ul></section><section><h2>完工候補</h2><ul>${completed || "<li>なし</li>"}</ul></section><section><h2>7日以上動きなし</h2><ul>${stalled || "<li>なし</li>"}</ul></section><section><h2>今週の学習</h2><ul>${learning || "<li>なし</li>"}</ul></section></body></html>`;
  return new Response(html, { headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
  } });
}
