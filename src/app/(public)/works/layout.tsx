import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skcoom.co.jp';

export const metadata: Metadata = {
  title: '施工実績',
  description: '公開のご了承をいただいたSKコームの施工実績をご紹介します。住宅・賃貸物件・店舗などの工事写真や内容を、ご相談前の参考としてご覧ください。',
  alternates: {
    canonical: '/works',
  },
  openGraph: {
    title: '施工実績 | SKコーム',
    description: '公開のご了承をいただいた施工実績を、ご相談前の参考としてご覧いただけます。',
    type: 'website',
    url: `${siteUrl}/works`,
  },
  twitter: {
    card: 'summary_large_image',
    title: '施工実績 | SKコーム',
    description: '公開のご了承をいただいた施工実績を、ご相談前の参考としてご覧いただけます。',
  },
};

export default function WorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
