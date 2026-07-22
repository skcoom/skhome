import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // セッションの更新
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 管理画面へのアクセスで未認証の場合はログインページへリダイレクト
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

  if (isAdminRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  if (isAdminRoute && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .single();

    if (!profile) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('error', 'profile');
      return NextResponse.redirect(url);
    }

    const pathname = request.nextUrl.pathname;
    const adminOnlyRoutes = ['/admin/users', '/admin/profit', '/admin/settings'];
    const staffOnlyRoutes = [
      '/admin/genba',
      '/admin/suppliers',
      '/admin/additional-works',
      '/admin/blog',
      '/admin/contacts',
    ];
    const projectWriteRoute =
      pathname === '/admin/projects/new'
      || /\/admin\/projects\/[^/]+\/(edit|budget|labor|orders|additional-works)(\/|$)/.test(pathname);

    const isForbidden =
      (profile.role !== 'admin' && adminOnlyRoutes.some((route) => pathname.startsWith(route)))
      || (profile.role === 'partner' && staffOnlyRoutes.some((route) => pathname.startsWith(route)))
      || (profile.role === 'partner' && projectWriteRoute);

    if (isForbidden) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/dashboard';
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }
  }

  // ログイン済みでログインページにアクセスした場合はダッシュボードへ
  if (request.nextUrl.pathname === '/auth/login' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
