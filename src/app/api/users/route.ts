import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { findAuthUserByEmail } from '@/lib/supabase/auth-users';
import { requireAdmin } from '@/lib/auth';

// ユーザー一覧取得（管理者のみ）
export async function GET() {
  try {
    // 管理者権限チェック
    const { user, error: authError } = await requireAdmin();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Users fetch error:', error);
      return NextResponse.json({ error: 'ユーザーの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// ユーザー作成（管理者のみ）
export async function POST(request: NextRequest) {
  try {
    // 管理者権限チェック
    const { user, error: authError } = await requireAdmin();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const body = await request.json();
    const { email, name, role, company_name } = body;

    // バリデーション
    if (
      typeof email !== 'string'
      || typeof name !== 'string'
      || typeof role !== 'string'
      || !email.trim()
      || !name.trim()
      || !role
    ) {
      return NextResponse.json(
        { error: 'メールアドレス、名前、役割は必須です' },
        { status: 400 }
      );
    }

    if (!['admin', 'staff', 'partner'].includes(role)) {
      return NextResponse.json(
        { error: '有効な役割を指定してください' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Admin clientを使用して、既存のログイン情報または新規招待と利用者情報を結び付ける
    const adminClient = createAdminClient();

    const { data: existingProfiles, error: existingProfileError } = await adminClient
      .from('users')
      .select('id, email');

    if (existingProfileError) {
      console.error('Existing user profile fetch error:', existingProfileError);
      return NextResponse.json({ error: 'ユーザー情報の確認に失敗しました' }, { status: 500 });
    }

    const existingProfile = existingProfiles.find(
      (profile) => profile.email.trim().toLowerCase() === normalizedEmail,
    );

    if (existingProfile) {
      return NextResponse.json(
        { error: 'このメールアドレスは、すでにユーザー管理に登録されています' },
        { status: 409 }
      );
    }

    const existingAuthUser = await findAuthUserByEmail(
      (params) => adminClient.auth.admin.listUsers(params),
      normalizedEmail,
    );

    let authUser = existingAuthUser;
    let invitedNewUser = false;

    if (!authUser) {
      // Supabase Authにユーザーを招待
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
        data: {
          name: name.trim(),
          role,
          company_name: company_name || null,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/invite`,
      });

      if (inviteError) {
        console.error('Invite error:', inviteError);
        return NextResponse.json(
          { error: `招待メールの送信に失敗しました: ${inviteError.message}` },
          { status: 500 }
        );
      }

      if (!inviteData.user) {
        return NextResponse.json(
          { error: 'ユーザーの作成に失敗しました' },
          { status: 500 }
        );
      }

      authUser = inviteData.user;
      invitedNewUser = true;
    }

    // usersテーブルにも保存（auth.usersのIDと一致させる）
    const { data, error } = await adminClient
      .from('users')
      .insert({
        id: authUser.id,
        auth_user_id: authUser.id,
        email: normalizedEmail,
        name: name.trim(),
        role,
        company_name: company_name || null,
      })
      .select()
      .single();

    if (error) {
      console.error('User insert error:', error);
      // この処理で新規招待した場合だけ、Authユーザーも削除して元の状態へ戻す。
      // 既存のログイン情報は消さない。
      if (invitedNewUser) {
        await adminClient.auth.admin.deleteUser(authUser.id);
      }
      return NextResponse.json({ error: 'ユーザー情報の登録に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      ...data,
      message: existingAuthUser
        ? '既存のログインアカウントに管理画面の利用権限を設定しました。招待メールは送信していません。'
        : '招待メールを送信しました。パスワードを設定するとログインできます。',
    }, { status: 201 });
  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
