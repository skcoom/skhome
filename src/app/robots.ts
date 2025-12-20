import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skcoom.co.jp';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/projects/',
          '/users/',
          '/contacts/',
          '/auth/',
          '/_next/',
          '/login',
        ],
      },
      // AI/LLMクローラー向けの設定
      {
        userAgent: 'GPTBot',
        allow: ['/', '/llms.txt'],
        disallow: ['/api/', '/admin/', '/dashboard/', '/auth/'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: ['/', '/llms.txt'],
        disallow: ['/api/', '/admin/', '/dashboard/', '/auth/'],
      },
      {
        userAgent: 'Claude-Web',
        allow: ['/', '/llms.txt'],
        disallow: ['/api/', '/admin/', '/dashboard/', '/auth/'],
      },
      {
        userAgent: 'Anthropic-AI',
        allow: ['/', '/llms.txt'],
        disallow: ['/api/', '/admin/', '/dashboard/', '/auth/'],
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/', '/llms.txt'],
        disallow: ['/api/', '/admin/', '/dashboard/', '/auth/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    // AI/LLMクローラー向けの追加情報
    host: baseUrl,
  };
}
