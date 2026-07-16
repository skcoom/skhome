import { createClient } from '@/lib/supabase/server';

const DEFAULT_GENBA_AI_BASE_URL = 'https://skhome-genba-ai.suetake6183.workers.dev';

export function genbaAiBaseUrl(): string {
  const configured = process.env.GENBA_AI_BASE_URL || DEFAULT_GENBA_AI_BASE_URL;
  const url = new URL(configured);
  if (url.protocol !== 'https:') throw new Error('GENBA_AI_BASE_URL must use HTTPS');
  return url.origin;
}

export async function currentAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function fetchPrivateGenbaMedia(eventId: string, accessToken: string): Promise<Response> {
  return fetch(`${genbaAiBaseUrl()}/admin/media/${encodeURIComponent(eventId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
}
