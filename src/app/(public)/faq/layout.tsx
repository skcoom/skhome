import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'よくあるご質問',
  description:
    'SKコームへのご相談、現地確認、お見積もり、工事の進め方、対応範囲など、よくあるご質問をまとめました。',
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return children;
}
