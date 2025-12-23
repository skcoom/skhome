---
paths: src/**/*.ts, src/**/*.tsx
---

# TypeScript 開発規約

## 厳密な型定義

- 型を明示する（anyは禁止）
- 関数の戻り値型を指定
- Propsはinterfaceで定義

## インターフェース命名

```typescript
// コンポーネントProps
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

// データ型
interface User {
  id: string;
  name: string;
  email: string;
}
```

## 戻り値型の明示

```typescript
// 関数
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// 非同期関数
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

## ユーティリティ型の活用

```typescript
// 部分的な型
type PartialUser = Partial<User>;

// 必須化
type RequiredUser = Required<User>;

// 特定プロパティのみ
type UserName = Pick<User, 'name'>;

// 特定プロパティを除外
type UserWithoutId = Omit<User, 'id'>;
```

## 禁止事項

```typescript
// any型
const data: any = fetchData();  // NG

// 型アサーションの乱用
const user = data as User;  // 可能な限り避ける

// 暗黙のany
function process(data) { ... }  // NG: 引数に型がない
```
