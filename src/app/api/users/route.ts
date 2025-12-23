import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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
    if (!email || !name || !role) {
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

    // Admin clientを使用して招待メールを送信
    const adminClient = createAdminClient();

    // Supabase Authにユーザーを招待
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        name,
        role,
        company_name: company_name || null,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/invite`,
    });

    if (inviteError) {
      console.error('Invite error:', inviteError);
      // 重複エラーの場合
      if (inviteError.message.includes('already been registered')) {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録されています' },
          { status: 400 }
        );
      }
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

    // usersテーブルにも保存（auth.usersのIDと一致させる）
    const { data, error } = await adminClient
      .from('users')
      .insert({
        id: inviteData.user.id,
        email,
        name,
        role,
        company_name: company_name || null,
      })
      .select()
      .single();

    if (error) {
      console.error('User insert error:', error);
      // Authユーザーは作成されたがusersテーブルへの挿入が失敗した場合
      // ロールバックのためAuthユーザーを削除
      await adminClient.auth.admin.deleteUser(inviteData.user.id);
      return NextResponse.json({ error: 'ユーザーの作成に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      ...data,
      message: '招待メールを送信しました。ユーザーがパスワードを設定するとログイン可能になります。',
    }, { status: 201 });
  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
