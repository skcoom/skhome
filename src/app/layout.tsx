import type { Metadata } from "next";
import "./globals.css";
import GoogleAnalytics from "@/components/google-analytics";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skcoom.co.jp';

export const metadata: Metadata = {
  title: {
    default: "SKコーム | さいたま市の内装リフォーム",
    template: "%s | SKコーム",
  },
  description: "さいたま市を中心に、住宅・賃貸物件・店舗などの内装リフォームをご相談いただけます。現地を確認し、必要な工事・費用・制約を分かりやすくご説明します。",
  keywords: ["内装リフォーム", "賃貸リノベーション", "間取り変更", "店舗内装", "埼玉", "さいたま市", "SKコーム"],
  authors: [{ name: "SKコーム" }],
  creator: "SKコーム",
  publisher: "SKコーム",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: siteUrl,
    siteName: 'SKコーム',
    title: 'SKコーム | さいたま市の内装リフォーム',
    description: '住宅・賃貸物件・店舗などの内装リフォームについて、工事内容が決まっていない段階からご相談いただけます。',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '株式会社SKコーム',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SKコーム | さいたま市の内装リフォーム',
    description: '住宅・賃貸物件・店舗などの内装リフォームについて、工事内容が決まっていない段階からご相談いただけます。',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: '50hZmYgkT3JEV_qqW94RVyYBm2NpfSMszuBGgx0Ts00',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SKコーム',
  },
};

// 構造化データ（JSON-LD）
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${siteUrl}/#organization`,
  name: 'SKコーム',
  alternateName: 'SK-KOMU',
  description: 'さいたま市を拠点に、住宅・賃貸物件・店舗などの内装リフォームを手がける会社です。',
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  image: `${siteUrl}/og-image.png`,
  telephone: '090-3357-4379',
  email: 'info@skcoom.co.jp',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '東浦和8-2-12',
    addressLocality: 'さいたま市緑区',
    addressRegion: '埼玉県',
    postalCode: '336-0926',
    addressCountry: 'JP',
  },
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '08:00',
    closes: '19:00',
  },
  areaServed: [
    { '@type': 'AdministrativeArea', name: '埼玉県' },
    { '@type': 'AdministrativeArea', name: '東京都' },
  ],
  serviceType: ['内装リフォーム', '賃貸リノベーション', '間取り変更', '店舗内装'],
  founder: {
    '@type': 'Person',
    name: '末武修平',
    jobTitle: '代表取締役',
  },
  sameAs: [],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@400;600&family=Noto+Sans+JP:wght@300;400;500;700&family=Inter:wght@400;600&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
