import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Récupération des jetons et cookies d'authentification
  const sessionCookie = request.cookies.get('agri_session')?.value;
  const roleCookie = request.cookies.get('agri_user_role')?.value;
  const tokenCookie =
    request.cookies.get('sb-access-token')?.value ||
    request.cookies.get('supabase-auth-token')?.value;
  const authHeader = request.headers.get('authorization');

  const isAuthenticated = Boolean(sessionCookie || tokenCookie || authHeader);

  // 1. Contrôle des routes de la console admin
  if (pathname.startsWith('/admin')) {
    if (roleCookie === 'admin') {
      return NextResponse.next();
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (tokenCookie && supabaseUrl && supabaseAnonKey) {
      try {
        const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            Authorization: `Bearer ${tokenCookie}`,
            apikey: supabaseAnonKey,
          },
          signal: AbortSignal.timeout(1000),
        });

        if (authRes.ok) {
          const user = await authRes.json();
          if (user?.id) {
            const profileRes = await fetch(
              `${supabaseUrl}/rest/v1/profiles?user_id=eq.${user.id}&select=role`,
              {
                headers: {
                  Authorization: `Bearer ${tokenCookie}`,
                  apikey: supabaseAnonKey,
                },
                signal: AbortSignal.timeout(1000),
              }
            );

            if (profileRes.ok) {
              const profiles = await profileRes.json();
              const role = profiles?.[0]?.role;

              if (role === 'admin') {
                const response = NextResponse.next();
                response.cookies.set('agri_user_role', 'admin', {
                  path: '/',
                  maxAge: 60 * 60 * 24 * 7,
                  sameSite: 'lax',
                });
                return response;
              }
            }
          }
        }
      } catch (err) {
        console.error('Erreur vérification token Supabase dans middleware admin:', err);
      }
    }

    // Si non admin mais connecté, retour vers dashboard
    if (isAuthenticated) {
      const redirectUrl = new URL('/dashboard', request.url);
      redirectUrl.searchParams.set('error', 'unauthorized_admin');
      return NextResponse.redirect(redirectUrl);
    }

    // Non connecté du tout
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    redirectUrl.searchParams.set('reason', 'admin_required');
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Contrôle strict côté serveur des routes privées du SaaS
  const isPrivatePage =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/alerts') ||
    pathname.startsWith('/history') ||
    pathname.startsWith('/parametres') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/payment') ||
    pathname.startsWith('/signalements') ||
    pathname.startsWith('/assistant');

  const isPrivateApi =
    pathname.startsWith('/api/farms') ||
    pathname.startsWith('/api/simulator/save') ||
    pathname.startsWith('/api/simulator/history');

  if (!isAuthenticated) {
    if (isPrivateApi) {
      return NextResponse.json(
        { success: false, error: 'Session invalide ou non authentifiée.' },
        { status: 401 }
      );
    }

    if (isPrivatePage) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      redirectUrl.searchParams.set('reason', 'auth_required');
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/alerts',
    '/alerts/:path*',
    '/history',
    '/history/:path*',
    '/parametres',
    '/parametres/:path*',
    '/profile',
    '/profile/:path*',
    '/payment',
    '/payment/:path*',
    '/signalements',
    '/signalements/:path*',
    '/assistant',
    '/assistant/:path*',
    '/api/farms/:path*',
    '/api/simulator/save',
    '/api/simulator/history',
  ],
};
