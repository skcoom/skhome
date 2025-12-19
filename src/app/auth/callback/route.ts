import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const type = searchParams.get('type'); // invite, recovery, signup など

  const supabase = await createClient();

  // codeがある場合はセッションを交換
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Code exchange error:', error);
    }
  }

  // セッションが存在するか確認（Supabaseが直接cookieを設定している場合も含む）
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // 招待リンクの場合はパスワード設定ページへ
    if (type === 'invite' || type === 'recovery') {
      return NextResponse.redirect(`${origin}/auth/set-password`);
    }
    // nextパラメータにset-passwordが含まれている場合もパスワード設定へ
    if (next.includes('set-password')) {
      return NextResponse.redirect(`${origin}/auth/set-password`);
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  // セッションがない場合はログインページへリダイレクト
  return NextResponse.redirect(`${origin}/auth/login?error=callback_error`);
}
