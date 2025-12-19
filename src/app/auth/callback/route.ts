import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const type = searchParams.get('type'); // invite, recovery, signup など

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
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
  }

  // エラー時はログインページへリダイレクト
  return NextResponse.redirect(`${origin}/auth/login?error=callback_error`);
}
