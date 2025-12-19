import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const code = searchParams.get('code');

  const supabase = await createClient();

  // PKCEフロー: codeがある場合はセッションを交換
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Code exchange error:', error);
      return NextResponse.redirect(`${origin}/auth/login?error=code_exchange_failed`);
    }
  }

  // token_hashがある場合はOTPで認証
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'invite' | 'recovery' | 'signup' | 'email',
    });
    if (error) {
      console.error('OTP verification error:', error);
      return NextResponse.redirect(`${origin}/auth/login?error=verification_failed`);
    }
  }

  // セッションを確認
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // パスワード設定ページへリダイレクト
    return NextResponse.redirect(`${origin}/auth/set-password`);
  }

  // セッションがない場合はログインページへ
  return NextResponse.redirect(`${origin}/auth/login?error=no_session`);
}
