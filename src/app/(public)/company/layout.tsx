import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skcoom.co.jp';

export const metadata: Metadata = {
  title: '会社概要',
  description: 'SKコームは埼玉県さいたま市を拠点にリフォーム・内装工事を手がける会社です。つくり手が直接お客様と向き合う、信頼のリフォームをお届けします。',
  alternates: {
    canonical: '/company',
  },
  openGraph: {
    title: '会社概要 | SKコーム',
    description: 'SKコームは埼玉県さいたま市を拠点にリフォーム・内装工事を手がける会社です。つくり手が直接お客様と向き合う、信頼のリフォームをお届けします。',
    type: 'website',
    url: `${siteUrl}/company`,
  },
  twitter: {
    card: 'summary_large_image',
    title: '会社概要 | SKコーム',
    description: 'SKコームは埼玉県さいたま市を拠点にリフォーム・内装工事を手がける会社です。',
  },
};

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
