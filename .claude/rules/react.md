---
paths: src/**/*.tsx
---

# React 開発規約

## Server Components がデフォルト

```typescript
// Server Component（非同期可能）
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

## Client Components の指定

```typescript
'use client';

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      {count}
    </button>
  );
}
```

## Client Componentが必要なケース

- useState, useEffect等のReact Hooksを使用
- onClickなどのイベントハンドラを使用
- ブラウザAPIにアクセス（window, document等）
- 状態管理ライブラリを使用

## Server Componentで可能なこと

- データベースへの直接アクセス
- ファイルシステムへのアクセス
- 機密情報（APIキー等）の使用
- 大きな依存関係のインポート（クライアントに送信されない）

## コンポーネント設計

```typescript
// Props型を必ず定義
interface CardProps {
  title: string;
  children: React.ReactNode;
}

// 関数コンポーネント
export function Card({ title, children }: CardProps) {
  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </div>
  );
}
```

## 禁止事項

- Server Componentでのusestate/useEffect使用
- 'use client'なしでのイベントハンドラ使用
- 不要なClient Component化（パフォーマンス低下）
