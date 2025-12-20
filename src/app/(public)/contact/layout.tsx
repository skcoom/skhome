import type { Metadata } from 'next';
import { generateFAQData, generateBreadcrumbData } from '@/lib/structured-data';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skcoom.co.jp';

export const metadata: Metadata = {
  title: 'お問い合わせ',
  description: 'SKコームへのお問い合わせはこちら。リフォームのご相談、お見積りのご依頼など、お気軽にお問い合わせください。現地調査・お見積りは無料です。',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'お問い合わせ | SKコーム',
    description: 'SKコームへのお問い合わせはこちら。リフォームのご相談、お見積りのご依頼など、お気軽にお問い合わせください。現地調査・お見積りは無料です。',
    type: 'website',
    url: `${siteUrl}/contact`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'お問い合わせ | SKコーム',
    description: 'リフォームのご相談、お見積りのご依頼など、お気軽にお問い合わせください。',
  },
};

// FAQ構造化データ
const faqData = generateFAQData([
  {
    question: '見積りは無料ですか？',
    answer: 'はい、現地調査・お見積りは無料で承っております。お気軽にご依頼ください。',
  },
  {
    question: 'どのくらいの期間で工事が完了しますか？',
    answer: '工事内容により異なりますが、キッチンリフォームで約1週間、フルリノベーションで1〜2ヶ月程度が目安です。',
  },
  {
    question: '住みながらの工事は可能ですか？',
    answer: 'はい、多くの場合は住みながらの工事が可能です。工事内容に応じて、ご不便を最小限に抑える工程をご提案いたします。',
  },
  {
    question: '小さな修繕でも対応してもらえますか？',
    answer: 'はい、小さな修繕から大規模なリノベーションまで、幅広く対応しております。',
  },
]);

// パンくずリスト構造化データ
const breadcrumbData = generateBreadcrumbData([
  { name: 'ホーム', url: '/' },
  { name: 'お問い合わせ', url: '/contact' },
]);

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      {children}
    </>
  );
}
