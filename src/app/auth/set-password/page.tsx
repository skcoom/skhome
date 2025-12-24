'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    // URLからトークンを取得してセッションを確立
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session error:', error);
        setIsValidSession(false);
        return;
      }

      // セッションがあり、パスワードがまだ設定されていないユーザーかどうかを確認
      if (session?.user) {
        setIsValidSession(true);
      } else {
        // URLにトークンがある場合はコールバック処理を待つ
        const code = searchParams.get('code');
        if (code) {
          // コールバックルートで処理されるはず
          setIsValidSession(true);
        } else {
          setIsValidSession(false);
        }
      }
    };

    checkSession();
  }, [supabase, searchParams]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // バリデーション
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
      // 3秒後にダッシュボードへリダイレクト
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 3000);
    } catch {
      setError('パスワードの設定に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (isValidSession === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-md">
          <div className="rounded-lg bg-white px-8 py-10 shadow-lg text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-4">リンクが無効です</h1>
            <p className="text-gray-600 mb-6">
              招待リンクの有効期限が切れているか、無効なリンクです。<br />
              管理者に再度招待を依頼してください。
            </p>
            <Button onClick={() => router.push('/auth/login')}>
              ログインページへ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-md">
          <div className="rounded-lg bg-white px-8 py-10 shadow-lg text-center">
            <div className="mb-4 text-green-500">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-4">パスワードを設定しました</h1>
            <p className="text-gray-600">
              ダッシュボードへ移動します...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white px-8 py-10 shadow-lg">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">パスワード設定</h1>
            <p className="mt-2 text-sm text-gray-600">
              ログイン用のパスワードを設定してください
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSetPassword} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Input
              id="password"
              type="password"
              label="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上で入力"
              required
            />

            <Input
              id="confirmPassword"
              type="password"
              label="パスワード（確認）"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="もう一度入力"
              required
            />

            <div className="text-xs text-gray-500">
              <p>パスワードの条件:</p>
              <ul className="list-disc ml-4 mt-1">
                <li>8文字以上</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              パスワードを設定
            </Button>
          </form>
        </div>

        {/* Company info */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">株式会社SKコーム</p>
        </div>
      </div>
    </div>
  );
}
