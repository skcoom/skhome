import { formatGenbaReceivedAt } from '@/lib/genba-date';
import { findAuthUserByEmail } from '@/lib/supabase/auth-users';

describe('現場管理画面の安全対策', () => {
  it('受信日時を日本時間で固定して表示する', () => {
    expect(formatGenbaReceivedAt('2026-07-15T18:10:00.000Z')).toBe('7/16 03:10');
  });

  it('既存のログイン情報をメールアドレスの大文字小文字にかかわらず見つける', async () => {
    const listUsers = jest.fn()
      .mockResolvedValueOnce({
        data: { users: [{ id: 'other-user', email: 'other@example.com' }], nextPage: 2 },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { users: [{ id: 'admin-user', email: 'Admin@Example.com' }], nextPage: null },
        error: null,
      });

    await expect(findAuthUserByEmail(listUsers, ' admin@example.com ')).resolves.toEqual({
      id: 'admin-user',
      email: 'Admin@Example.com',
    });
    expect(listUsers).toHaveBeenCalledTimes(2);
  });

  it('一致するログイン情報がなければnullを返す', async () => {
    const listUsers = jest.fn().mockResolvedValue({
      data: { users: [], nextPage: null },
      error: null,
    });

    await expect(findAuthUserByEmail(listUsers, 'missing@example.com')).resolves.toBeNull();
  });

  it('ログイン情報の取得失敗を正常終了として扱わない', async () => {
    const listUsers = jest.fn().mockResolvedValue({
      data: { users: [], nextPage: null },
      error: { message: 'permission denied' },
    });

    await expect(findAuthUserByEmail(listUsers, 'admin@example.com')).rejects.toThrow(
      'ログインアカウントの確認に失敗しました',
    );
  });
});
