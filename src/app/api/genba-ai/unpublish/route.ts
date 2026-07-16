import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const unpublishSchema = z.object({ eventId: z.string().uuid() });

export async function POST(request: Request) {
  const { user, error: authError } = await requirePermission('media:write');
  if (!user) {
    return NextResponse.json({ error: authError || '認証が必要です' }, { status: 403 });
  }

  const parsed = unpublishSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: '掲載を停止する写真を確認してください' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: media, error: mediaError } = await admin
    .from('project_media')
    .select('public_storage_path, publication_status')
    .eq('genba_line_event_id', parsed.data.eventId)
    .single();

  if (mediaError || media?.publication_status !== 'published' || !media.public_storage_path) {
    return NextResponse.json({ error: '公開中の写真が見つかりません' }, { status: 404 });
  }
  if (!media.public_storage_path.startsWith('genba-public/')) {
    return NextResponse.json({ error: '公開用コピーの保存先を確認できません' }, { status: 409 });
  }

  // 先に公開ファイルを消す。後続のDB更新が失敗しても写真自体は露出しない順序にする。
  const { error: removeError } = await admin.storage.from('project-media').remove([media.public_storage_path]);
  if (removeError) {
    return NextResponse.json({ error: '公開用コピーを削除できませんでした' }, { status: 500 });
  }

  const { error: unpublishError } = await admin.rpc('admin_unpublish_genba_media', {
    p_event_id: parsed.data.eventId,
    p_reviewer_id: user.id,
  });
  if (unpublishError) {
    console.error('Genba media unpublish failed:', unpublishError.message);
    return NextResponse.json({ error: '写真は削除しましたが、台帳更新に失敗しました。管理者へ連絡してください' }, { status: 500 });
  }

  return NextResponse.json({ unpublished: parsed.data.eventId });
}
