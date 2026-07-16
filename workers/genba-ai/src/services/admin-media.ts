import { SupabaseClient } from "../clients/supabase";
import type { Env } from "../types";

export function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization") ?? "";
  const match = authorization.match(/^Bearer ([^\s]+)$/u);
  return match?.[1] ?? null;
}

function privateHeaders(contentType: string, etag?: string): Headers {
  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  });
  if (etag) headers.set("ETag", etag);
  return headers;
}

export async function handleAdminMedia(request: Request, eventId: string, env: Env): Promise<Response> {
  const accessToken = bearerToken(request);
  if (!accessToken) {
    return new Response("Unauthorized", {
      status: 401,
      headers: privateHeaders("text/plain; charset=utf-8"),
    });
  }

  const db = new SupabaseClient(env);
  if (!(await db.isAdminOrStaffAccessToken(accessToken))) {
    return new Response("Forbidden", {
      status: 403,
      headers: privateHeaders("text/plain; charset=utf-8"),
    });
  }

  const event = await db.getAdminMediaEvent(eventId);
  if (!event?.r2_key) {
    return new Response("Not found", {
      status: 404,
      headers: privateHeaders("text/plain; charset=utf-8"),
    });
  }

  const object = await env.PHOTOS.get(event.r2_key);
  if (!object) {
    return new Response("Not found", {
      status: 404,
      headers: privateHeaders("text/plain; charset=utf-8"),
    });
  }

  return new Response(object.body, {
    headers: privateHeaders(
      object.httpMetadata?.contentType ?? event.content_type ?? "application/octet-stream",
      object.httpEtag,
    ),
  });
}
