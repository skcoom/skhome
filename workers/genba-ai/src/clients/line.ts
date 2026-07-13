import type { Env, LineSource } from "../types";

export interface LineContent {
  bytes: ArrayBuffer;
  contentType: string;
}

export async function getLineContent(messageId: string, env: Env): Promise<LineContent> {
  const response = await fetch(
    `${env.LINE_DATA_API_BASE_URL}/v2/bot/message/${encodeURIComponent(messageId)}/content`,
    {
      headers: { Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!response.ok) {
    throw new Error(`LINE content API failed: ${response.status}`);
  }
  return {
    bytes: await response.arrayBuffer(),
    contentType: response.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream",
  };
}

export function getSourceId(source: LineSource): string {
  if (source.type === "group") return source.groupId;
  if (source.type === "room") return source.roomId;
  return source.userId;
}

export function getSenderId(source: LineSource): string | null {
  return source.userId ?? null;
}

async function lineApi(path: string, env: Env, init: RequestInit = {}): Promise<Response> {
  return fetch(`${env.LINE_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
      ...init.headers,
    },
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });
}

export async function getDisplayName(source: LineSource, env: Env): Promise<string | null> {
  const userId = source.userId;
  if (!userId) return null;
  let path: string;
  if (source.type === "group") {
    path = `/v2/bot/group/${encodeURIComponent(source.groupId)}/member/${encodeURIComponent(userId)}`;
  } else if (source.type === "room") {
    path = `/v2/bot/room/${encodeURIComponent(source.roomId)}/member/${encodeURIComponent(userId)}`;
  } else {
    path = `/v2/bot/profile/${encodeURIComponent(userId)}`;
  }
  const response = await lineApi(path, env);
  if (!response.ok) return null;
  const profile = await response.json() as { displayName?: string };
  return profile.displayName ?? null;
}
