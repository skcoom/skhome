// ブログカテゴリラベル
export const BLOG_CATEGORY_LABELS: Record<string, string> = {
  all: 'すべて',
  news: 'ニュース',
  column: 'コラム',
  case_study: '施工事例',
};

// プロジェクト（施工実績）カテゴリラベル
export const PROJECT_CATEGORY_LABELS: Record<string, string> = {
  all: 'すべて',
  remodeling: 'リフォーム',
  apartment: 'マンション',
  new_construction: '新築',
  house: '住宅',
};

// ブログステータスラベル
export const BLOG_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '下書き', color: 'bg-gray-100 text-gray-800' },
  published: { label: '公開中', color: 'bg-green-100 text-green-800' },
};
