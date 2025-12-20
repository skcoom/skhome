import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: heroMedia, error } = await supabase
      .from('project_media')
      .select(`
        *,
        projects:project_id (
          id,
          name
        )
      `)
      .not('hero_position', 'is', null)
      .order('hero_position', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ heroMedia: heroMedia || [] });
  } catch (error) {
    console.error('Error fetching hero settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { selections } = body as { selections: { mediaId: string; position: 1 | 2 | 3 }[] };

    if (!selections || !Array.isArray(selections)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // まず全てのhero_positionをリセット
    const { error: resetError } = await supabase
      .from('project_media')
      .update({ hero_position: null })
      .not('hero_position', 'is', null);

    if (resetError) {
      return NextResponse.json({ error: resetError.message }, { status: 500 });
    }

    // 新しい選択を設定
    for (const selection of selections) {
      const { error: updateError } = await supabase
        .from('project_media')
        .update({ hero_position: selection.position })
        .eq('id', selection.mediaId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating hero settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
