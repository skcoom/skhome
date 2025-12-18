import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = Promise<{ id: string }>;

// お問い合わせステータス更新
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !['pending', 'in_progress', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: '有効なステータスを指定してください' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('contacts')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Contact update error:', error);
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// お問い合わせ削除
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Contact delete error:', error);
      return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
