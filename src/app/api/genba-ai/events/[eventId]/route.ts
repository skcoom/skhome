import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

type Params = Promise<{ eventId: string }>;

const reviewSchema = z.object({
  siteId: z.string().uuid(),
  phase: z.enum(['before', 'during', 'after']),
  publicationStatus: z.enum(['internal', 'selected']),
});

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { user, error: authError } = await requirePermission('media:write');
  if (!user) {
    return NextResponse.json({ error: authError || '認証が必要です' }, { status: 403 });
  }

  const { eventId } = await params;
  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: '変更内容を確認してください。' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('admin_review_genba_media', {
    p_event_id: eventId,
    p_reviewer_id: user.id,
    p_site_id: parsed.data.siteId,
    p_phase: parsed.data.phase,
    p_publication_status: parsed.data.publicationStatus,
  });

  if (error) {
    console.error('Genba media review failed:', error.message);
    return NextResponse.json({ error: '変更内容を保存できませんでした。' }, { status: 500 });
  }

  return NextResponse.json({ media: data });
}
