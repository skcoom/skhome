import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function createAdminUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('環境変数が設定されていません');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const email = 's.suetake@skcoom.co.jp';
  const name = '末武修平';
  const role = 'admin';

  // 既存ユーザーチェック
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (existingUser) {
    console.log('既に登録済み:', existingUser);
    return;
  }

  // 招待メールを送信
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name, role },
    redirectTo: 'https://skcoom.co.jp/auth/invite'
  });

  if (inviteError) {
    console.error('招待エラー:', inviteError.message);
    process.exit(1);
  }

  // usersテーブルに保存
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: inviteData.user.id,
      email,
      name,
      role,
      company_name: 'SKコーム'
    })
    .select()
    .single();

  if (error) {
    console.error('ユーザー登録エラー:', error.message);
    await supabase.auth.admin.deleteUser(inviteData.user.id);
    process.exit(1);
  }

  console.log('管理者アカウント作成完了:', data);
  console.log('招待メールを送信しました。メールからパスワードを設定してください。');
}

createAdminUser().catch(console.error);
