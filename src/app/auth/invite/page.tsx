'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function InvitePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleInvite = async () => {
      try {
        // URLフラグメントからトークンを取得
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (!accessToken || !refreshToken) {
          // フラグメントにトークンがない場合、クエリパラメータを確認
          const searchParams = new URLSearchParams(window.location.search);
          const code = searchParams.get('code');

          if (code) {
            // PKCEフローの場合
            const supabase = createClient();
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error('Code exchange error:', error);
              setError('認証に失敗しました。もう一度お試しください。');
              return;
            }
            router.push('/auth/set-password');
            return;
          }

          setError('招待リンクが無効です。管理者に再度招待を依頼してください。');
          return;
        }

        // Supabaseクライアントでセッションを設定
        const supabase = createClient();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('セッションの設定に失敗しました。');
          return;
        }

        // パスワード設定ページへリダイレクト
        router.push('/auth/set-password');
      } catch (err) {
        console.error('Invite handling error:', err);
        setError('予期せぬエラーが発生しました。');
      } finally {
        setIsProcessing(false);
      }
    };

    handleInvite();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">エラー</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/auth/login"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            ログインページへ
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">認証中...</h1>
        <p className="text-gray-600">パスワード設定ページへリダイレクトしています。</p>
      </div>
    </div>
  );
}
