import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth';
import { currentAccessToken, fetchPrivateGenbaMedia } from '@/lib/genba-ai';
import { createAdminClient } from '@/lib/supabase/admin';

const publishSchema = z.object({
  eventIds: z.array(z.string().uuid()).min(1).max(12).transform((ids) => [...new Set(ids)]),
});

const imageExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(request: Request) {
  const { user, error: authError } = await requirePermission('media:write');
  if (!user) {
    return NextResponse.json({ error: authError || '認証が必要です' }, { status: 403 });
  }

  const parsed = publishSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: '公開する写真を1〜12枚で選んでください' }, { status: 400 });
  }

  const accessToken = await currentAccessToken();
  if (!accessToken) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });

  const admin = createAdminClient();
  const { data: ledger, error: ledgerError } = await admin
    .from('project_media')
    .select('id, project_id, genba_line_event_id, publication_status')
    .in('genba_line_event_id', parsed.data.eventIds);

  if (ledgerError) {
    return NextResponse.json({ error: '公開候補を確認できませんでした' }, { status: 500 });
  }

  const ledgerByEvent = new Map((ledger || []).map((row) => [row.genba_line_event_id, row]));
  const published: string[] = [];
  const failed: Array<{ eventId: string; reason: string }> = [];

  for (const eventId of parsed.data.eventIds) {
    const media = ledgerByEvent.get(eventId);
    if (!media || media.publication_status !== 'selected') {
      failed.push({ eventId, reason: '公開候補に選ばれていません' });
      continue;
    }

    const source = await fetchPrivateGenbaMedia(eventId, accessToken);
    const contentType = source.headers.get('Content-Type')?.split(';')[0] || '';
    const extension = imageExtensions[contentType];
    if (!source.ok || !extension) {
      failed.push({ eventId, reason: '原本を安全に読み出せませんでした' });
      continue;
    }

    const bytes = await source.arrayBuffer();
    if (bytes.byteLength > 20 * 1024 * 1024) {
      failed.push({ eventId, reason: '公開用写真の上限20MBを超えています' });
      continue;
    }

    const storagePath = `genba-public/${media.project_id}/${eventId}.${extension}`;
    const { error: uploadError } = await admin.storage
      .from('project-media')
      .upload(storagePath, bytes, {
        contentType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      failed.push({ eventId, reason: '公開用コピーを作成できませんでした' });
      continue;
    }

    const { data: publicData } = admin.storage.from('project-media').getPublicUrl(storagePath);
    const { error: publishError } = await admin.rpc('admin_publish_genba_media', {
      p_event_id: eventId,
      p_reviewer_id: user.id,
      p_file_url: publicData.publicUrl,
      p_storage_path: storagePath,
    });

    if (publishError) {
      await admin.storage.from('project-media').remove([storagePath]);
      failed.push({ eventId, reason: '公開台帳を更新できませんでした' });
      continue;
    }

    published.push(eventId);
  }

  return NextResponse.json({ published, failed }, { status: failed.length > 0 ? 207 : 200 });
}
