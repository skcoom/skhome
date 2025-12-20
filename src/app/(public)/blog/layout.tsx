import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skcoom.co.jp';

export const metadata: Metadata = {
  title: 'ブログ',
  description: 'SKコームのブログ。施工事例やリフォームに関するお役立ち情報をお届けします。AIが自動生成した施工レポートも掲載しています。',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'ブログ | SKコーム',
    description: 'SKコームのブログ。施工事例やリフォームに関するお役立ち情報をお届けします。AIが自動生成した施工レポートも掲載しています。',
    type: 'website',
    url: `${siteUrl}/blog`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ブログ | SKコーム',
    description: '施工事例やリフォームに関するお役立ち情報をお届けします。',
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
