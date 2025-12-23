// ブログカテゴリラベル
export const BLOG_CATEGORY_LABELS: Record<string, string> = {
  all: 'すべて',
  news: 'ニュース',
  column: 'コラム',
  case_study: '施工事例',
};

/** @deprecated PROJECT_TAGSを使用してください */
export const PROJECT_CATEGORY_LABELS: Record<string, string> = {
  all: 'すべて',
  remodeling: 'リフォーム',
  apartment: 'マンション',
  new_construction: '新築',
  house: '住宅',
};

// プロジェクト（施工実績）タグ
export const PROJECT_TAGS = [
  '全面リフォーム',
  'キッチン',
  '浴室・洗面',
  'トイレ',
  'リビング・居室',
  '玄関・廊下',
  '外壁・屋根',
  '看板',
  '住宅',
  '店舗',
] as const;

// ブログステータスラベル
export const BLOG_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '下書き', color: 'bg-gray-100 text-gray-800' },
  published: { label: '公開中', color: 'bg-green-100 text-green-800' },
};

// 書類タイプ
export const DOCUMENT_TYPE_LABELS: Record<string, { label: string; color: string; badge: string }> = {
  estimate: { label: '見積書', color: 'bg-amber-100 text-amber-800', badge: '見積済' },
  invoice: { label: '請求書', color: 'bg-purple-100 text-purple-800', badge: '請求済' },
  contract: { label: '契約書', color: 'bg-emerald-100 text-emerald-800', badge: '契約済' },
  other: { label: 'その他', color: 'bg-gray-100 text-gray-800', badge: '' },
};

export const DOCUMENT_TYPES = ['estimate', 'invoice', 'contract', 'other'] as const;
