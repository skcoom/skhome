import { createClient } from '@supabase/supabase-js';

const apply = process.argv.includes('--apply');
const emailArg = process.argv.find((argument) => argument.startsWith('--email='));
const confirmArg = process.argv.find((argument) => argument.startsWith('--confirm='));
const email = emailArg?.slice('--email='.length).trim().toLowerCase();
const confirmation = confirmArg?.slice('--confirm='.length).trim().toLowerCase();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email) throw new Error('--email=対象メールアドレス を指定してください');
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profiles, error: profileError } = await supabase
  .from('users')
  .select('id, email, role, auth_user_id, created_at')
  .eq('email', email);
if (profileError) throw profileError;

const profileIds = (profiles || []).map((profile) => profile.id);
const referenceCounts = {};
for (const [table, column] of [
  ['projects', 'created_by'],
  ['project_media', 'uploaded_by'],
  ['project_documents', 'uploaded_by'],
  ['project_progress', 'created_by'],
  ['project_members', 'user_id'],
]) {
  if (profileIds.length === 0) {
    referenceCounts[table] = 0;
    continue;
  }
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .in(column, profileIds);
  if (error) throw error;
  referenceCounts[table] = count || 0;
}

let authUsers = [];
for (let page = 1; page <= 20; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  authUsers.push(...data.users.filter((user) => user.email?.toLowerCase() === email));
  if (!data.nextPage) break;
}

const summary = {
  email,
  profileCount: profiles?.length || 0,
  linkedProfileCount: (profiles || []).filter((profile) => profile.auth_user_id).length,
  authAccountCount: authUsers.length,
  lastSignInDates: authUsers.map((user) => user.last_sign_in_at || null),
  referenceCounts,
};

if (!apply) {
  console.log(JSON.stringify({ mode: 'dry-run', ...summary }, null, 2));
  console.log('削除する場合だけ --apply --confirm=対象メールアドレス を追加してください。');
  process.exit(0);
}

if (confirmation !== email) throw new Error('--confirm が対象メールアドレスと一致しません');
if (Object.values(referenceCounts).some((count) => count > 0)) {
  throw new Error('関連データがあるため削除できません');
}

for (const authUser of authUsers) {
  const { error } = await supabase.auth.admin.deleteUser(authUser.id);
  if (error) throw error;
}
if (profileIds.length > 0) {
  const { error } = await supabase.from('users').delete().in('id', profileIds);
  if (error) throw error;
}

console.log(JSON.stringify({ mode: 'apply', deletedProfiles: profileIds.length, deletedAuthAccounts: authUsers.length }, null, 2));
