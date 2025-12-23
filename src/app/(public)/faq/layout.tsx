import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'よくあるご質問 | SKコーム',
  description:
    'SKコームへよくいただくご質問をまとめました。お見積り・費用、工事期間、対応範囲など、リフォームに関する疑問にお答えします。',
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return children;
}
