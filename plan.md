# 修正計画：追加ボタンの位置変更

## 概要
現場管理ページのメディアグリッドで、「追加」ボタン（プレースホルダー）をサムネイルの最後から最初に移動する。

## 対象ファイル
`src/app/(admin)/admin/projects/[id]/page.tsx`

## 修正内容

### 変更箇所
964-1122行目のメディアグリッド部分

### 現在の構造
```tsx
<div className="grid ...">
  {media.filter(...).map((item) => (
    // サムネイル表示
  ))}

  {/* Upload placeholder - 最後に配置 */}
  <button onClick={() => setShowUploadModal(true)}>
    <Plus /> 追加
  </button>
</div>
```

### 修正後の構造
```tsx
<div className="grid ...">
  {/* Upload placeholder - 最初に配置 */}
  <button onClick={() => setShowUploadModal(true)}>
    <Plus /> 追加
  </button>

  {media.filter(...).map((item) => (
    // サムネイル表示
  ))}
</div>
```

## 影響範囲
- 管理画面のプロジェクト詳細ページのみ
- UI表示の変更のみで、データの保存順序には影響なし
