import { verifyLineSignature } from "../security/signature";
import {
  archiveMessageImages,
  processPreparedMessageEvents,
  registerMessageEvents,
} from "./event-processor";
import type { Env, LineMessageEvent, LineWebhookBody } from "../types";

function isLineWebhookBody(value: unknown): value is LineWebhookBody {
  if (!value || typeof value !== "object") return false;
  const events = (value as { events?: unknown }).events;
  return Array.isArray(events);
}

export async function handleWebhook(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");
  const verified = await verifyLineSignature(rawBody, signature, env.LINE_CHANNEL_SECRET);
  if (!verified) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (!isLineWebhookBody(parsed)) {
    return Response.json({ error: "invalid webhook body" }, { status: 400 });
  }

  const messageEvents = parsed.events.filter(
    (event): event is LineMessageEvent => event.type === "message" && Boolean(event.message?.id),
  );
  let prepared: Awaited<ReturnType<typeof registerMessageEvents>>;
  try {
    const archived = await archiveMessageImages(messageEvents, env);
    prepared = await registerMessageEvents(messageEvents, archived, env);
  } catch (error) {
    console.error("durable intake before acknowledgement failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "durable intake failed" }, { status: 502 });
  }
  ctx.waitUntil(
    processPreparedMessageEvents(prepared, env).catch((error: unknown) => {
      console.error("webhook processing failed", error instanceof Error ? error.message : error);
    }),
  );
  return Response.json({ accepted: messageEvents.length });
}
