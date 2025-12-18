'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white px-8 py-10 shadow-lg">
          {/* Logo */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">SKコーム</h1>
            <p className="mt-2 text-sm text-gray-600">SKHOME</p>
          </div>

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Input
              id="email"
              type="email"
              label="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />

            <Input
              id="password"
              type="password"
              label="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              required
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              ログイン
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              ログインできない場合は管理者にお問い合わせください
            </p>
          </div>
        </div>

        {/* Company info */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">株式会社SKコーム</p>
        </div>
      </div>
    </div>
  );
}
