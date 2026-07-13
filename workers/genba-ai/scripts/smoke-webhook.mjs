import { createHmac } from "node:crypto";

const endpoint = process.env.WORKER_URL ?? "http://127.0.0.1:8787/webhook";
const secret = process.env.LINE_CHANNEL_SECRET ?? "local-test-secret";
const messageId = process.env.SMOKE_MESSAGE_ID ?? "mock-message-001";
const body = JSON.stringify({
  destination: "local-destination",
  events: [
    {
      type: "message",
      mode: "active",
      timestamp: 1783612800000,
      source: { type: "group", groupId: "mock-group", userId: "mock-user" },
      webhookEventId: "mock-webhook-event-001",
      deliveryContext: { isRedelivery: false },
      replyToken: "mock-reply-token",
      message: { id: messageId, type: "image", contentProvider: { type: "line" } }
    }
  ]
});
const signature = createHmac("sha256", secret).update(body).digest("base64");
const response = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json", "x-line-signature": signature },
  body
});
const text = await response.text();
process.stdout.write(`${response.status} ${text}\n`);
if (response.status !== 200) process.exitCode = 1;
