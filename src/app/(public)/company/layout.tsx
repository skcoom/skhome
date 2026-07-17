import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skcoom.co.jp';

export const metadata: Metadata = {
  title: '会社案内',
  description: 'SKコームは、さいたま市を拠点に住宅・賃貸物件・店舗などの内装リフォームを手がける会社です。会社情報と仕事の進め方をご紹介します。',
  alternates: {
    canonical: '/company',
  },
  openGraph: {
    title: '会社案内 | SKコーム',
    description: 'SKコームは、さいたま市を拠点に住宅・賃貸物件・店舗などの内装リフォームを手がける会社です。',
    type: 'website',
    url: `${siteUrl}/company`,
  },
  twitter: {
    card: 'summary_large_image',
    title: '会社案内 | SKコーム',
    description: 'SKコームは、さいたま市を拠点に住宅・賃貸物件・店舗などの内装リフォームを手がける会社です。',
  },
};

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
