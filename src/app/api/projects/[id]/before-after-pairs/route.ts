import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth';
import type { AlignmentSettings, BeforeAfterPair, ProjectMedia } from '@/types/database';
import { revalidatePath } from 'next/cache';
import { signPrivateMedia } from '@/lib/media-storage';

type Params = Promise<{ id: string }>;

async function signPairMedia(pair: BeforeAfterPair): Promise<BeforeAfterPair> {
  const admin = createAdminClient();
  return {
    ...pair,
    before_media: pair.before_media
      ? await signPrivateMedia(admin, pair.before_media as ProjectMedia)
      : undefined,
    after_media: pair.after_media
      ? await signPrivateMedia(admin, pair.after_media as ProjectMedia)
      : undefined,
  };
}

export async function GET(request: NextRequest, { params }: { params: Params }): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { user, error: authError } = await requirePermission('media:read');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 },
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('before_after_pairs')
      .select(`
        *,
        before_media:project_media!before_media_id(*),
        after_media:project_media!after_media_id(*)
      `)
      .eq('project_id', id)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Before-after pairs fetch error:', error);
      return NextResponse.json({ error: 'ペア情報の取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(await Promise.all(((data || []) as BeforeAfterPair[]).map(signPairMedia)));
  } catch (error) {
    console.error('Before-after pairs API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Params }): Promise<NextResponse> {
  try {
    const { id } = await params;

    const { user, error: authError } = await requirePermission('media:write');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();
    const { before_media_id, after_media_id, label, display_order } = body;

    if (!before_media_id || !after_media_id) {
      return NextResponse.json({ error: 'before_media_idとafter_media_idは必須です' }, { status: 400 });
    }

    const { data: pairMedia, error: pairMediaError } = await supabase
      .from('project_media')
      .select('id, phase')
      .eq('project_id', id)
      .in('id', [before_media_id, after_media_id]);
    const beforeMedia = pairMedia?.find((media) => media.id === before_media_id);
    const afterMedia = pairMedia?.find((media) => media.id === after_media_id);
    if (pairMediaError || beforeMedia?.phase !== 'before' || afterMedia?.phase !== 'after') {
      return NextResponse.json(
        { error: 'この現場の施工前写真と施工後写真を選んでください' },
        { status: 400 },
      );
    }

    const { data: existingCount } = await supabase
      .from('before_after_pairs')
      .select('id', { count: 'exact' })
      .eq('project_id', id);

    const { data, error } = await supabase
      .from('before_after_pairs')
      .insert({
        project_id: id,
        before_media_id,
        after_media_id,
        label: label || null,
        display_order: display_order ?? (existingCount?.length || 0),
      })
      .select(`
        *,
        before_media:project_media!before_media_id(*),
        after_media:project_media!after_media_id(*)
      `)
      .single();

    if (error) {
      console.error('Before-after pair insert error:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'この画像は既に他のペアで使用されています' }, { status: 400 });
      }
      return NextResponse.json({ error: 'ペアの作成に失敗しました' }, { status: 500 });
    }

    revalidatePath(`/works/${id}`);
    return NextResponse.json(await signPairMedia(data as BeforeAfterPair), { status: 201 });
  } catch (error) {
    console.error('Before-after pair API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Params }): Promise<NextResponse> {
  try {
    const { id } = await params;

    const { user, error: authError } = await requirePermission('media:write');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();
    const { pair_id, label, display_order, alignment_settings } = body;

    if (!pair_id) {
      return NextResponse.json({ error: 'pair_idは必須です' }, { status: 400 });
    }

    const updateData: {
      label?: string | null;
      display_order?: number;
      alignment_settings?: AlignmentSettings | null;
    } = {};
    if (label !== undefined) updateData.label = label;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (alignment_settings !== undefined) updateData.alignment_settings = alignment_settings;

    const { data, error } = await supabase
      .from('before_after_pairs')
      .update(updateData)
      .eq('id', pair_id)
      .eq('project_id', id)
      .select()
      .single();

    if (error) {
      console.error('Before-after pair update error:', error);
      return NextResponse.json({ error: 'ペアの更新に失敗しました' }, { status: 500 });
    }

    revalidatePath(`/works/${id}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Before-after pair PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Params }): Promise<NextResponse> {
  try {
    const { id } = await params;

    const { user, error: authError } = await requirePermission('media:delete');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const pairId = searchParams.get('pairId');

    if (!pairId) {
      return NextResponse.json({ error: 'pairIdは必須です' }, { status: 400 });
    }

    const { error } = await supabase
      .from('before_after_pairs')
      .delete()
      .eq('id', pairId)
      .eq('project_id', id);

    if (error) {
      console.error('Before-after pair delete error:', error);
      return NextResponse.json({ error: 'ペアの削除に失敗しました' }, { status: 500 });
    }

    revalidatePath(`/works/${id}`);
    return NextResponse.json({ success: true, message: 'ペアを削除しました' });
  } catch (error) {
    console.error('Before-after pair DELETE error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
