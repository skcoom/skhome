import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { currentAccessToken, fetchPrivateGenbaMedia } from '@/lib/genba-ai';

type Params = Promise<{ eventId: string }>;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function GET(_: Request, { params }: { params: Params }) {
  const { user } = await requireStaff();
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const { eventId } = await params;
  if (!uuidPattern.test(eventId)) {
    return NextResponse.json({ error: '写真が見つかりません' }, { status: 404 });
  }

  const accessToken = await currentAccessToken();
  if (!accessToken) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const response = await fetchPrivateGenbaMedia(eventId, accessToken);
  if (!response.ok || !response.body) {
    return NextResponse.json({ error: '写真を表示できません' }, { status: response.status === 403 ? 403 : 404 });
  }

  return new NextResponse(response.body, {
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
