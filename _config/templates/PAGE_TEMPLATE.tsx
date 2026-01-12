/**
 * ページテンプレート
 *
 * 使用方法:
 * 1. src/app/(public)/ または src/app/(admin)/ に配置
 * 2. ディレクトリ名をページパスに合わせる
 * 3. ファイル名は page.tsx のまま
 * 4. PageName を実際の名前に置換
 */

import { ReactNode } from 'react';
import { Metadata } from 'next';

// メタデータ（SEO）
export const metadata: Metadata = {
  title: 'ページタイトル | SK-KOMU',
  description: 'ページの説明文',
};

// Props の型定義（動的ルートの場合）
interface PageProps {
  params: Promise<{ id?: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}

// ページコンポーネント（Server Component）
export default async function PageName({
  params: _params,
  searchParams: _searchParams,
}: PageProps): Promise<ReactNode> {
  // 動的パラメータの取得（必要な場合）
  // const { id } = await params;
  // const query = await searchParams;

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          ページタイトル
        </h1>

        {/* コンテンツ */}
      </div>
    </main>
  );
}
