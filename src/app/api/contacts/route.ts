import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// お問い合わせ一覧取得（管理者用）
export async function GET() {
  try {
    const supabase = await createClient();

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Contacts fetch error:', error);
      return NextResponse.json({ error: 'お問い合わせの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Contacts API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// お問い合わせ送信（公開）
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { name, email, phone, message } = body;

    // バリデーション
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: '名前、メールアドレス、メッセージは必須です' },
        { status: 400 }
      );
    }

    // メールアドレスの簡易バリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        name,
        email,
        phone: phone || null,
        message,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Contact insert error:', error);
      return NextResponse.json({ error: 'お問い合わせの送信に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
