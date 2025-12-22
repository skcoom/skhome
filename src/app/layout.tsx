import type { Metadata } from "next";
import "./globals.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skcoom.co.jp';

export const metadata: Metadata = {
  title: {
    default: "SKコーム | リフォーム・建築",
    template: "%s | SKコーム",
  },
  description: "お客様の暮らしの「つづき」をつくる、信頼のリフォーム会社です。埼玉県さいたま市を中心に、住宅リフォーム・リノベーション・新築工事を手掛けています。",
  keywords: ["リフォーム", "建築", "リノベーション", "埼玉", "さいたま市", "住宅改修", "SKコーム"],
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
    title: 'SKコーム | リフォーム・建築',
    description: 'お客様の暮らしの「つづき」をつくる、信頼のリフォーム会社です。埼玉県さいたま市を中心に、住宅リフォーム・リノベーション・新築工事を手掛けています。',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SKコーム - リフォーム・建築',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SKコーム | リフォーム・建築',
    description: 'お客様の暮らしの「つづき」をつくる、信頼のリフォーム会社です。',
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
};

// 構造化データ（JSON-LD）
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${siteUrl}/#organization`,
  name: 'SKコーム',
  alternateName: 'SK-KOMU',
  description: 'お客様の暮らしの「つづき」をつくる、信頼のリフォーム会社です。',
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  image: `${siteUrl}/og-image.png`,
  telephone: '048-711-1359',
  email: 'info@skcoom.co.jp',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '東浦和8-2-12',
    addressLocality: 'さいたま市緑区',
    addressRegion: '埼玉県',
    postalCode: '336-0926',
    addressCountry: 'JP',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 35.8614,
    longitude: 139.7167,
  },
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '08:00',
    closes: '18:00',
  },
  priceRange: '$$',
  areaServed: {
    '@type': 'GeoCircle',
    geoMidpoint: {
      '@type': 'GeoCoordinates',
      latitude: 35.9138,
      longitude: 139.6547,
    },
    geoRadius: '50000',
  },
  serviceType: ['リフォーム', '建築', 'リノベーション', '住宅改修'],
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
