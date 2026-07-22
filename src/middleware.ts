import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// スパム攻撃で生成された不正URLパターン
const SPAM_URL_PATTERNS = [
  /\.phtml$/i,                    // .phtml拡張子
  /^\/shopbrand/i,                // /shopbrand/...
  /^\/item\//i,                   // /item/...
  /^\/goods\//i,                  // /goods/...
  /^\/detail\//i,                 // /detail/...
  /^\/info\/\d+/i,                // /info/数字
  /^\/goodscode\//i,              // /goodscode/...
  /^\/shopping\d+/i,              // /shopping数字
  /^\/single-house\/\d+\/feed/i,  // WordPressフィード形式
  /^\/category\//i,               // /category/...
  /^\/blog_category\//i,          // /blog_category/...
  /^\/リフォーム\/\d+/i,           // /リフォーム/数字
];

function isSpamUrl(pathname: string): boolean {
  return SPAM_URL_PATTERNS.some(pattern => pattern.test(pathname));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 合意済みデザインの原本はサーバー側の描画専用。重複ページとして公開しない。
  if (pathname === '/_approved-home-source.html') {
    return new NextResponse(null, {
      status: 404,
      headers: { 'X-Robots-Tag': 'noindex, nofollow, noarchive' },
    });
  }

  // スパムURLには410 Goneを返す
  if (isSpamUrl(pathname)) {
    return new NextResponse(null, {
      status: 410,
      statusText: 'Gone',
      headers: {
        'X-Robots-Tag': 'noindex',
      },
    });
  }

  // セッション更新と権限判定は管理画面・ログイン画面だけで行う。
  if (pathname.startsWith('/admin') || pathname === '/auth/login') {
    return await updateSession(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 以下のパスを除く全てのリクエストでミドルウェアを実行:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico (ファビコン)
     * - public フォルダ内の画像
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
