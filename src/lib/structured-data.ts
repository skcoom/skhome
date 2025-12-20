const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skcoom.co.jp';

// 会社情報（共通）
export const organizationData = {
  '@type': 'LocalBusiness',
  '@id': `${siteUrl}/#organization`,
  name: 'SKコーム',
  alternateName: 'SK-KOMU',
  description: 'お客様の暮らしの「つづき」をつくる、信頼のリフォーム会社です。',
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
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
};

// パンくずリスト構造化データ
export function generateBreadcrumbData(
  items: { name: string; url: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${siteUrl}${item.url}`,
    })),
  };
}

// ブログ記事構造化データ
export function generateBlogPostingData(post: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string | null;
  modifiedAt?: string | null;
  featuredImage?: string | null;
  authorName?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: `${siteUrl}/blog/${post.slug}`,
    image: post.featuredImage || `${siteUrl}/og-image.png`,
    datePublished: post.publishedAt || new Date().toISOString(),
    dateModified: post.modifiedAt || post.publishedAt || new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: post.authorName || 'SKコーム',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'SKコーム',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/blog/${post.slug}`,
    },
  };
}

// FAQ構造化データ
export function generateFAQData(
  faqs: { question: string; answer: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// 施工実績（Service）構造化データ
export function generateServiceData(service: {
  name: string;
  description: string;
  url: string;
  image?: string | null;
  category?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description,
    url: service.url.startsWith('http') ? service.url : `${siteUrl}${service.url}`,
    image: service.image || `${siteUrl}/og-image.png`,
    provider: organizationData,
    areaServed: {
      '@type': 'GeoCircle',
      geoMidpoint: {
        '@type': 'GeoCoordinates',
        latitude: 35.8617,
        longitude: 139.6455,
      },
      geoRadius: '50000',
    },
    serviceType: service.category || 'リフォーム',
  };
}

// WebSite構造化データ（サイト全体用）
export const websiteData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${siteUrl}/#website`,
  name: 'SKコーム',
  url: siteUrl,
  description: 'お客様の暮らしの「つづき」をつくる、信頼のリフォーム会社です。',
  publisher: {
    '@id': `${siteUrl}/#organization`,
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteUrl}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
  inLanguage: 'ja-JP',
};
