import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getAuthUser, requirePermission } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { ProjectMedia } from '@/types/database';
import { preparePrivateMediaForBrowser } from '@/lib/media-storage';

type Params = Promise<{ id: string }>;

// 現場詳細取得（公開ページからも使用されるため認証不要）
export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { user } = await getAuthUser();
    if (!user) {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          public_title,
          public_location,
          public_description,
          tags,
          status,
          start_date,
          end_date,
          is_public,
          main_media_id,
          created_at,
          updated_at,
          project_media!project_media_project_id_fkey (
            id,
            project_id,
            type,
            phase,
            file_url,
            thumbnail_url,
            caption,
            is_featured,
            publication_status,
            created_at
          )
        `)
        .eq('id', id)
        .eq('is_public', true)
        .not('public_reviewed_at', 'is', null)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 });
      }

      return NextResponse.json({
        ...data,
        name: data.public_title,
        address: data.public_location,
        description: data.public_description,
        project_media: (data.project_media || []).filter(
          (media: { publication_status?: string; is_featured?: boolean }) =>
            media.publication_status === 'published' && media.is_featured === false,
        ),
      });
    }

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_media!project_media_project_id_fkey (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Project fetch error:', error);
      return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 });
    }

    const admin = createAdminClient();
    const projectMedia = await Promise.all(
      ((data.project_media || []) as ProjectMedia[]).map(
        (media) => preparePrivateMediaForBrowser(admin, media),
      ),
    );
    return NextResponse.json({ ...data, project_media: projectMedia });
  } catch (error) {
    console.error('Project API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// 現場更新（スタッフ以上）
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;

    // 権限チェック
    const { user, error: authError } = await requirePermission('projects:write');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();
    const {
      name,
      client_name,
      address,
      category,
      tags,
      status,
      start_date,
      end_date,
      description,
      public_description,
      public_title,
      public_location,
      main_media_id,
      is_public,
      confirm_publication,
    } = body;

    if (is_public === true && confirm_publication !== true) {
      return NextResponse.json(
        { error: '公開前に、公開用の案件名・地域・概要を確認してください' },
        { status: 409 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (client_name !== undefined) updateData.client_name = client_name;
    if (address !== undefined) updateData.address = address;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (status !== undefined) updateData.status = status;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (description !== undefined) updateData.description = description;
    if (public_description !== undefined) updateData.public_description = public_description;
    if (public_title !== undefined) updateData.public_title = public_title;
    if (public_location !== undefined) updateData.public_location = public_location;
    if (main_media_id !== undefined) {
      if (main_media_id === null) {
        updateData.main_media_id = null;
      } else if (typeof main_media_id === 'string') {
        const { data: publicMedia } = await supabase
          .from('project_media')
          .select('id')
          .eq('id', main_media_id)
          .eq('project_id', id)
          .eq('publication_status', 'published')
          .eq('is_featured', false)
          .single();
        if (!publicMedia) {
          return NextResponse.json(
            { error: 'ホームページ掲載中の写真からメイン画像を選んでください' },
            { status: 400 },
          );
        }
        updateData.main_media_id = main_media_id;
      } else {
        return NextResponse.json({ error: 'メイン画像の指定が正しくありません' }, { status: 400 });
      }
    }
    if (is_public === false) {
      updateData.is_public = false;
      updateData.public_reviewed_at = null;
      updateData.public_reviewed_by = null;
    }

    if (typeof public_title === 'string' && public_title.trim().length > 100) {
      return NextResponse.json({ error: '公開用の案件名は100文字以内で入力してください' }, { status: 400 });
    }
    if (typeof public_location === 'string' && public_location.trim().length > 100) {
      return NextResponse.json({ error: '公開用の地域名は100文字以内で入力してください' }, { status: 400 });
    }

    let data;
    let error;

    if (Object.keys(updateData).length > 0) {
      const result = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      const result = await supabase.from('projects').select('*').eq('id', id).single();
      data = result.data;
      error = result.error;
    }

    if (error || !data) {
      console.error('Project update error:', error);
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }

    if (is_public === true) {
      if (!data.public_title?.trim() || !data.public_description?.trim()) {
        return NextResponse.json(
          { error: '公開用の案件名と公開用概要を入力してください。管理用の工事名・住所・メモは公開されません' },
          { status: 400 },
        );
      }

      const publishResult = await supabase
        .from('projects')
        .update({
          is_public: true,
          public_reviewed_at: new Date().toISOString(),
          public_reviewed_by: user.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (publishResult.error || !publishResult.data) {
        console.error('Project publish error:', publishResult.error);
        return NextResponse.json({ error: '公開設定を保存できませんでした' }, { status: 500 });
      }
      data = publishResult.data;
    }

    revalidatePath('/works');
    revalidatePath(`/works/${id}`);
    revalidatePath('/sitemap.xml');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Project API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// 現場削除（管理者のみ）
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;

    // 権限チェック
    const { user, error: authError } = await requirePermission('projects:delete');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Project delete error:', error);
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }

    revalidatePath('/works');
    revalidatePath(`/works/${id}`);
    revalidatePath('/sitemap.xml');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Project API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
