/**
 * コンポーネントテンプレート
 *
 * 使用方法:
 * 1. このファイルをコピー
 * 2. ファイル名を PascalCase で変更（例: Button.tsx）
 * 3. ComponentName を実際の名前に置換
 * 4. Props を定義
 * 5. コンポーネントを実装
 */

// Client Component の場合のみ有効化
// 'use client';

import { ReactNode } from 'react';

// Props の型定義
interface ComponentNameProps {
  children?: ReactNode;
  className?: string;
  // 必要な props を追加
}

// コンポーネント本体
export function ComponentName({
  children,
  className = '',
}: ComponentNameProps): ReactNode {
  return (
    <div className={`${className}`}>
      {children}
    </div>
  );
}

// デフォルトエクスポート（必要に応じて）
// export default ComponentName;
