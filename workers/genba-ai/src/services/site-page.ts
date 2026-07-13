import { SupabaseClient } from "../clients/supabase";
import { verifySiteToken } from "../security/site-token";
import type { Env, SiteRecord } from "../types";

type SiteMedia = Awaited<ReturnType<SupabaseClient["getSiteMedia"]>>[number];
type SiteProgress = Awaited<ReturnType<SupabaseClient["getSiteProgress"]>>[number];

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function phaseLabel(phase: SiteMedia["phase"]): string {
  if (phase === "before") return "施工前";
  if (phase === "after") return "施工後";
  return "施工中";
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "short", day: "numeric" })
    .format(new Date(value));
}

export function renderSitePage(
  site: SiteRecord,
  media: SiteMedia[],
  progress: SiteProgress[],
  token: string,
  selectedPhase: string,
): string {
  const allowedPhase = selectedPhase === "before" || selectedPhase === "during" || selectedPhase === "after"
    ? selectedPhase
    : "all";
  const shownMedia = allowedPhase === "all" ? media : media.filter((item) => item.phase === allowedPhase);
  const tabs = [
    ["all", "すべて"],
    ["before", "施工前"],
    ["during", "施工中"],
    ["after", "施工後"],
  ].map(([value, label]) => {
    const active = allowedPhase === value ? " active" : "";
    return `<a class="tab${active}" href="?phase=${value}">${label}</a>`;
  }).join("");
  const cards = shownMedia.map((item) => {
    const key = item.r2_key ?? "";
    return `<figure class="card"><img loading="lazy" src="/media/${encodeURIComponent(key)}?token=${encodeURIComponent(token)}" alt="${escapeHtml(site.name)} ${phaseLabel(item.phase)}"><figcaption><span>${phaseLabel(item.phase)}</span><time>${dateLabel(item.created_at)}</time>${item.caption ? `<p>${escapeHtml(item.caption)}</p>` : ""}</figcaption></figure>`;
  }).join("");
  const timeline = progress.map((item) => `<li><time>${escapeHtml(item.date)}</time><p>${escapeHtml(item.description)}</p></li>`).join("");
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow,noarchive"><title>${escapeHtml(site.name)} | 現場写真</title><style>
:root{color-scheme:light;--ink:#18212b;--muted:#64748b;--line:#e2e8f0;--paper:#f8fafc;--brand:#164e63}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif}header{position:sticky;top:0;z-index:2;padding:calc(14px + env(safe-area-inset-top)) 16px 14px;background:#fff;border-bottom:1px solid var(--line)}h1{max-width:960px;margin:0 auto;font-size:1.15rem}.meta{max-width:960px;margin:4px auto 0;color:var(--muted);font-size:.8rem}main{max-width:960px;margin:auto;padding:16px 14px 48px}.tabs{display:flex;gap:8px;overflow:auto;padding-bottom:12px}.tab{flex:0 0 auto;padding:9px 14px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);text-decoration:none;font-size:.85rem}.tab.active{background:var(--brand);border-color:var(--brand);color:#fff}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.card{margin:0;overflow:hidden;border-radius:12px;background:#fff;box-shadow:0 1px 4px #0f172a14}.card img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;background:#e2e8f0}.card figcaption{display:flex;gap:6px;justify-content:space-between;padding:8px;color:var(--muted);font-size:.72rem}.card p{width:100%;margin:4px 0 0}.empty{padding:40px 12px;text-align:center;color:var(--muted);background:#fff;border-radius:12px}.timeline{margin-top:32px}.timeline h2{font-size:1rem}.timeline ol{padding:0;list-style:none}.timeline li{position:relative;margin-left:8px;padding:0 0 18px 20px;border-left:2px solid var(--line)}.timeline li:before{position:absolute;left:-6px;top:3px;width:10px;height:10px;border-radius:50%;background:var(--brand);content:""}.timeline time{color:var(--muted);font-size:.75rem}.timeline p{margin:3px 0;font-size:.9rem;white-space:pre-wrap}@media(min-width:700px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}header{padding-left:24px;padding-right:24px}main{padding-left:24px;padding-right:24px}}
</style></head><body><header><h1>${escapeHtml(site.name)}</h1><p class="meta">社内用 現場写真・進捗</p></header><main><nav class="tabs" aria-label="工程">${tabs}</nav>${shownMedia.length ? `<section class="grid">${cards}</section>` : '<p class="empty">この工程の写真はまだありません</p>'}<section class="timeline"><h2>進捗タイムライン</h2>${timeline ? `<ol>${timeline}</ol>` : '<p class="empty">進捗記録はまだありません</p>'}</section></main></body></html>`;
}

function pageHeaders(contentType: string): HeadersInit {
  return {
    "Content-Type": contentType,
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  };
}

export async function handleSitePage(request: Request, token: string, env: Env): Promise<Response> {
  const db = new SupabaseClient(env);
  const siteId = await verifySiteToken(token, env.LINE_CHANNEL_SECRET);
  const site = siteId ? await db.getSiteById(siteId) : null;
  if (!site) return new Response("Not found", { status: 404, headers: pageHeaders("text/plain; charset=utf-8") });
  const [media, progress] = await Promise.all([db.getSiteMedia(site.id), db.getSiteProgress(site.id)]);
  const phase = new URL(request.url).searchParams.get("phase") ?? "all";
  return new Response(renderSitePage(site, media, progress, token, phase), {
    headers: pageHeaders("text/html; charset=utf-8"),
  });
}

export async function handleMedia(token: string, encodedKey: string, env: Env): Promise<Response> {
  let key: string;
  try {
    key = decodeURIComponent(encodedKey);
  } catch {
    return new Response("Not found", { status: 404, headers: pageHeaders("text/plain; charset=utf-8") });
  }
  const db = new SupabaseClient(env);
  const siteId = await verifySiteToken(token, env.LINE_CHANNEL_SECRET);
  const site = siteId ? await db.getSiteById(siteId) : null;
  if (!site || !(await db.mediaBelongsToSite(site.id, key))) {
    return new Response("Not found", { status: 404, headers: pageHeaders("text/plain; charset=utf-8") });
  }
  const object = await env.PHOTOS.get(key);
  if (!object) return new Response("Not found", { status: 404, headers: pageHeaders("text/plain; charset=utf-8") });
  const headers = new Headers({
    "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
    "Cache-Control": "private, max-age=300",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    ETag: object.httpEtag,
  });
  return new Response(object.body, { headers });
}
