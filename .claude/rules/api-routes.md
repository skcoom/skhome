---
paths: src/app/api/**/*.ts
---

# APIルート開発規約

## レスポンス形式の統一

すべてのAPIは `NextResponse.json()` を使用し、一貫した形式で返す。

```typescript
// 成功レスポンス
return NextResponse.json({ data: result }, { status: 200 });

// エラーレスポンス
return NextResponse.json({ error: 'エラーメッセージ' }, { status: 400 });
```

## エラーハンドリング

try-catchで囲み、適切なステータスコードを返す。

```typescript
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    // 処理
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

## ステータスコードの使い分け

| コード | 用途 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | リクエスト不正（バリデーションエラー） |
| 401 | 認証エラー |
| 403 | 権限エラー |
| 404 | リソースなし |
| 500 | サーバーエラー |

## 入力バリデーション

リクエストボディは必ず検証する。

```typescript
const body = await request.json();

if (!body.title || typeof body.title !== 'string') {
  return NextResponse.json(
    { error: 'title is required' },
    { status: 400 }
  );
}
```

## 認証チェック

認証が必要なエンドポイントは最初にチェック。

```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 認証済みの処理
}
```

## 禁止事項

```typescript
// エラーメッセージに機密情報を含めない
return NextResponse.json({ error: error.message }); // NG: 内部エラー詳細の露出

// console.logで機密情報を出力しない
console.log('User password:', password); // NG
```
