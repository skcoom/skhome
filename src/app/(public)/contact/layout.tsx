import type { Metadata } from 'next';

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

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
