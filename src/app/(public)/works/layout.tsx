import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skcoom.co.jp';

export const metadata: Metadata = {
  title: '施工実績',
  description: 'SKコームの施工実績をご紹介。リフォーム、マンション工事、新築工事など、お客様のご要望に合わせた確かな施工をお届けしています。',
  alternates: {
    canonical: '/works',
  },
  openGraph: {
    title: '施工実績 | SKコーム',
    description: 'SKコームの施工実績をご紹介。リフォーム、マンション工事、新築工事など、お客様のご要望に合わせた確かな施工をお届けしています。',
    type: 'website',
    url: `${siteUrl}/works`,
  },
  twitter: {
    card: 'summary_large_image',
    title: '施工実績 | SKコーム',
    description: 'リフォーム、マンション工事、新築工事など、確かな施工をお届けしています。',
  },
};

export default function WorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
