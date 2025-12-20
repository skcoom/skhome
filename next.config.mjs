/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel deployment configuration
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          /**
           * Content-Security-Policy (CSP) 設定
           *
           * ⚠️ セキュリティ改善が必要な項目:
           *
           * 1. 'unsafe-inline' (script-src, style-src)
           *    - 現状: Next.jsの動作に必要なため許可
           *    - 改善: nonce-based CSPの導入を検討
           *    - 参考: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
           *
           * 2. 'unsafe-eval' (script-src)
           *    - 現状: 開発モードと一部ライブラリで必要
           *    - 改善: 本番環境では可能な限り削除を検討
           *    - 注意: 削除すると一部機能が動作しない可能性あり
           *
           * 将来の改善計画:
           * - Next.js 14+ のnonce対応を利用してCSPを強化
           * - script-src: nonce-{random} 'strict-dynamic'
           * - style-src: nonce-{random}
           */
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // TODO: 本番環境では 'unsafe-inline' 'unsafe-eval' を nonce ベースに移行
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          }
        ]
      }
    ];
  },
};

export default nextConfig;
