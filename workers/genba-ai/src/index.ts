import { handleWebhook } from "./services/webhook";
import { handleMedia, handleSitePage } from "./services/site-page";
import { handleWeeklyPage, runWeeklySummary } from "./services/weekly";
import { recoverPendingEvents } from "./services/event-processor";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/webhook") {
      return handleWebhook(request, env, ctx);
    }
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true, service: "genba-ai" });
    }
    const siteMatch = url.pathname.match(/^\/sites\/([^/]+)$/u);
    if (request.method === "GET" && siteMatch?.[1]) {
      return handleSitePage(request, siteMatch[1], env);
    }
    const mediaMatch = url.pathname.match(/^\/media\/(.+)$/u);
    const token = url.searchParams.get("token");
    if (request.method === "GET" && mediaMatch?.[1] && token) {
      return handleMedia(token, mediaMatch[1], env);
    }
    const weeklyMatch = url.pathname.match(/^\/weekly\/([^/]+)$/u);
    if (request.method === "GET" && weeklyMatch?.[1]) {
      return handleWeeklyPage(weeklyMatch[1], env);
    }
    return new Response("Not found", { status: 404 });
  },

  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    if (controller.cron === "0 23 * * SUN") {
      ctx.waitUntil(runWeeklySummary(env, controller.scheduledTime));
      return;
    }
    ctx.waitUntil(recoverPendingEvents(env, controller.scheduledTime));
  },
};
