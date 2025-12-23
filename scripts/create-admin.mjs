import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// .env.local を手動で読み込み
const envFile = readFileSync('.env.local', 'utf-8');
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

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
    console.log('usersテーブルに登録済み:', existingUser);

    // Supabase Authにユーザーが存在するか確認
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(u => u.email === email);

    if (authUser) {
      console.log('Supabase Authにも存在:', authUser.id);
    } else {
      console.log('Supabase Authにユーザーがありません。招待メールを送信します...');

      // 招待メールを送信
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { name: existingUser.name, role: existingUser.role },
        redirectTo: 'https://skcoom.co.jp/auth/invite'
      });

      if (inviteError) {
        console.error('招待エラー:', inviteError.message);
      } else {
        // usersテーブルのidを更新
        await supabase
          .from('users')
          .update({ id: inviteData.user.id })
          .eq('email', email);

        console.log('招待メール送信完了。メールからパスワードを設定してください。');
      }
    }
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
