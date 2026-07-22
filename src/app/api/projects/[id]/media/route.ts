import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser, requirePermission } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

type Params = Promise<{ id: string }>;

// プロジェクトのメディア一覧取得（公開ページからも使用）
export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const phase = searchParams.get('phase');
    const { user } = await getAuthUser();

    if (!user) {
      const { data: publicProject } = await supabase
        .from('projects')
        .select('id')
        .eq('id', id)
        .eq('is_public', true)
        .not('public_reviewed_at', 'is', null)
        .single();
      if (!publicProject) {
        return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 });
      }
    }

    const mediaColumns = user
      ? '*'
      : 'id, project_id, type, phase, file_url, thumbnail_url, caption, is_featured, publication_status, created_at';

    let query = supabase
      .from('project_media')
      .select(mediaColumns)
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    if (!user) {
      query = query.eq('publication_status', 'published').eq('is_featured', false);
    } else {
      // LINE原本の台帳行は専用画面で扱い、公開用コピーだけを既存ギャラリーへ渡す。
      query = query.or('genba_line_event_id.is.null,publication_status.eq.published');
    }

    if (phase) {
      query = query.eq('phase', phase);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Media fetch error:', error);
      return NextResponse.json({ error: 'メディアの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Media API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// メディア情報を登録（スタッフ以上）
export async function POST(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;

    // 権限チェック
    const { user, error: authError } = await requirePermission('media:write');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();
    const { type, phase, file_url, thumbnail_url, caption } = body;

    // バリデーション
    if (!file_url) {
      return NextResponse.json({ error: 'ファイルURLは必須です' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('project_media')
      .insert({
        project_id: id,
        type: type || 'image',
        phase: phase || 'during',
        file_url,
        thumbnail_url: thumbnail_url || null,
        caption: caption || null,
        uploaded_by: user.id,
        // 登録直後は必ず社内限定。公開はPATCHの明示操作だけで行う。
        is_featured: true,
        source_origin: 'manual',
        publication_status: 'internal',
      })
      .select()
      .single();

    if (error) {
      console.error('Media insert error:', error);
      return NextResponse.json({ error: 'メディアの登録に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Media API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// メディアのis_featuredを更新（スタッフ以上）
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;

    // 権限チェック
    const { user, error: authError } = await requirePermission('media:write');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();
    const { mediaIds, is_featured } = body;

    if (!mediaIds || !Array.isArray(mediaIds) || typeof is_featured !== 'boolean') {
      return NextResponse.json({ error: '写真と掲載状態を正しく指定してください' }, { status: 400 });
    }

    const uniqueMediaIds = [...new Set(mediaIds.filter(
      (mediaId): mediaId is string => typeof mediaId === 'string' && mediaId.length > 0,
    ))];

    if (uniqueMediaIds.length === 0) {
      return NextResponse.json({ error: '変更する写真を指定してください' }, { status: 400 });
    }

    const { data: targetMedia, error: targetError } = await supabase
      .from('project_media')
      .select('id, genba_line_event_id')
      .eq('project_id', id)
      .in('id', uniqueMediaIds);

    if (targetError) {
      console.error('Media target fetch error:', targetError);
      return NextResponse.json({ error: '写真情報の確認に失敗しました' }, { status: 500 });
    }

    if (
      targetMedia.length !== uniqueMediaIds.length
      || targetMedia.some((media) => media.genba_line_event_id !== null)
    ) {
      return NextResponse.json(
        { error: 'この画面で変更できない写真が含まれています。LINE写真は専用画面から管理してください' },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('project_media')
      .update({
        is_featured,
        publication_status: is_featured ? 'internal' : 'published',
      })
      .in('id', uniqueMediaIds)
      .eq('project_id', id)
      .is('genba_line_event_id', null)
      .select();

    if (error) {
      console.error('Media update error:', error);
      return NextResponse.json({ error: 'メディアの更新に失敗しました' }, { status: 500 });
    }

    if (data.length !== uniqueMediaIds.length) {
      return NextResponse.json(
        { error: '写真の状態が変わったため更新できませんでした。画面を再読み込みしてください' },
        { status: 409 }
      );
    }

    revalidatePath('/works');
    revalidatePath(`/works/${id}`);
    return NextResponse.json({
      success: true,
      updated: data,
      message: `${data.length}件のメディアを更新しました`,
    });
  } catch (error) {
    console.error('Media PATCH error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// メディアを削除（スタッフ以上）
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;

    // 権限チェック
    const { user, error: authError } = await requirePermission('media:delete');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');

    if (!mediaId) {
      return NextResponse.json({ error: 'mediaIdは必須です' }, { status: 400 });
    }

    // メディア情報を取得
    const { data: mediaData, error: fetchError } = await supabase
      .from('project_media')
      .select('*')
      .eq('id', mediaId)
      .eq('project_id', id)
      .single();

    if (fetchError || !mediaData) {
      return NextResponse.json({ error: 'メディアが見つかりません' }, { status: 404 });
    }

    if (mediaData.genba_line_event_id) {
      return NextResponse.json(
        { error: 'LINE写真は「LINE写真・AI判定」画面から管理してください' },
        { status: 409 }
      );
    }

    // ストレージからファイルを削除
    const fileUrl = mediaData.file_url;
    if (fileUrl) {
      const pathMatch = fileUrl.match(/project-media\/(.+)$/);
      if (pathMatch) {
        const filePath = pathMatch[1];
        await supabase.storage.from('project-media').remove([filePath]);
      }
    }

    // サムネイルも削除
    const thumbnailUrl = mediaData.thumbnail_url;
    if (thumbnailUrl) {
      const thumbMatch = thumbnailUrl.match(/project-media\/(.+)$/);
      if (thumbMatch) {
        const thumbPath = thumbMatch[1];
        await supabase.storage.from('project-media').remove([thumbPath]);
      }
    }

    // DBからレコードを削除
    const { error: deleteError } = await supabase
      .from('project_media')
      .delete()
      .eq('id', mediaId)
      .eq('project_id', id);

    if (deleteError) {
      console.error('Media delete error:', deleteError);
      return NextResponse.json({ error: 'メディアの削除に失敗しました' }, { status: 500 });
    }

    revalidatePath('/works');
    revalidatePath(`/works/${id}`);
    return NextResponse.json({ success: true, message: 'メディアを削除しました' });
  } catch (error) {
    console.error('Media DELETE error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
