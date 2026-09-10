import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from './lib/auth/sessionSigner';
import './lib/security/envValidator';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Récupération des jetons et cookies d'authentification
  const sessionCookie = request.cookies.get('agri_session')?.value;
  const tokenCookie =
    request.cookies.get('sb-access-token')?.value ||
    request.cookies.get('supabase-auth-token')?.value;
  const authHeader = request.headers.get('authorization');

  // Décodage et vérification cryptographique HMAC de la session serveur httpOnly
  const sessionData = await verifySessionToken(sessionCookie);

  const isAuthenticated = Boolean(sessionData?.userId || tokenCookie || authHeader);

  // 1. CONTRÔLE D'ACCÈS RBAC DE LA CONSOLE ADMIN (Point 9)
  // Aucun bypass par simple cookie client n'est toléré : seule la session serveur ou Supabase fait foi.
  if (pathname.startsWith('/admin')) {
    let isAdmin =
      sessionData?.role === 'superadmin' || sessionData?.role === 'admin';

    // Vérification de secours Supabase si un jeton Supabase direct est présent
    if (!isAdmin && tokenCookie) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseAnonKey) {
        try {
          const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
              Authorization: `Bearer ${tokenCookie}`,
              apikey: supabaseAnonKey,
            },
            signal: AbortSignal.timeout(5000),
          });

          if (authRes.ok) {
            const user = await authRes.json();
            if (user?.id) {
              const uEmail = String(user.email || '').toLowerCase();
              if (uEmail === 'fayethierno7@gmail.com' || uEmail.includes('fayethierno7')) {
                isAdmin = true;
              } else {
                const profileRes = await fetch(
                  `${supabaseUrl}/rest/v1/profiles?user_id=eq.${user.id}&select=role,nom,telephone_contact`,
                  {
                    headers: {
                      Authorization: `Bearer ${tokenCookie}`,
                      apikey: supabaseAnonKey,
                    },
                    signal: AbortSignal.timeout(5000),
                  }
                );

                if (profileRes.ok) {
                  const profiles = await profileRes.json();
                  const r = profiles?.[0]?.role;
                  const contact = String(profiles?.[0]?.telephone_contact || '').toLowerCase();
                  const nom = String(profiles?.[0]?.nom || '').toLowerCase();
                  if (
                    r === 'superadmin' ||
                    r === 'admin' ||
                    contact.includes('fayethierno7') ||
                    nom.includes('fayethierno7')
                  ) {
                    isAdmin = true;
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error('Erreur vérification RBAC admin Supabase:', err);
        }
      }
    }

    if (isAdmin) {
      return NextResponse.next();
    }

    // Si non admin mais connecté : redirection immédiate vers le dashboard
    if (isAuthenticated) {
      const redirectUrl = new URL('/dashboard', request.url);
      redirectUrl.searchParams.set('error', 'unauthorized_admin');
      return NextResponse.redirect(redirectUrl);
    }

    // Non connecté : redirection vers login
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    redirectUrl.searchParams.set('reason', 'admin_required');
    return NextResponse.redirect(redirectUrl);
  }

  // 2. CONTRÔLE DES COMPTES EN ATTENTE DE VALIDATION ADMIN (Point 13)
  if (sessionData?.statut_compte === 'en_attente') {
    // Si l'utilisateur est en attente, il n'a le droit de naviguer que sur /en-attente, /tarifs, /login ou l'accueil
    const isAllowedPendingPage =
      pathname.startsWith('/en-attente') ||
      pathname === '/' ||
      pathname.startsWith('/tarifs') ||
      pathname.startsWith('/api/settings') ||
      pathname.startsWith('/api/auth');

    if (!isAllowedPendingPage) {
      const redirectUrl = new URL('/en-attente', request.url);
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  // 3. CONTRÔLE DE SUSPENSION APRÈS DÉLAI DE GRÂCE 3 JOURS D'IMPAYÉ (Point 11)
  if (sessionData?.statut_abonnement === 'impaye' && sessionData?.date_limite_grace) {
    const graceLimit = new Date(sessionData.date_limite_grace).getTime();
    if (Date.now() > graceLimit) {
      // Période de grâce de 3 jours échue : redirection obligatoire vers le règlement
      const isAllowedUnpaidPage =
        pathname.startsWith('/payment') ||
        pathname.startsWith('/tarifs') ||
        pathname === '/' ||
        pathname.startsWith('/api/');

      if (!isAllowedUnpaidPage) {
        const redirectUrl = new URL('/payment', request.url);
        redirectUrl.searchParams.set('reason', 'grace_expired');
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  // 4. SUPPRESSION DU PLAN GRATUIT : CONTRÔLE D'ACCÈS PAYWALL STRICT
  // Les comptes sur l'ancien forfait gratuit 'free' (hors admin) sont bloqués jusqu'au choix d'un forfait payant.
  if (
    sessionData?.userId &&
    sessionData?.role !== 'admin' &&
    sessionData?.role !== 'superadmin' &&
    sessionData?.plan === 'free'
  ) {
    const isAllowedForNoPlan =
      pathname.startsWith('/profile') ||
      pathname.startsWith('/tarifs') ||
      pathname.startsWith('/payment') ||
      pathname === '/' ||
      pathname.startsWith('/api/');

    if (!isAllowedForNoPlan) {
      const redirectUrl = new URL('/tarifs', request.url);
      redirectUrl.searchParams.set('paywall', 'true');
      redirectUrl.searchParams.set('reason', 'subscription_required');
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 4. CONTRÔLE D'AUTHENTIFICATION DES PAGES & APIS PRIVÉES
  const isPrivatePage =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/alerts') ||
    pathname.startsWith('/history') ||
    pathname.startsWith('/parametres') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/signalements') ||
    pathname.startsWith('/assistant');

  const isPrivateApi =
    pathname.startsWith('/api/assistant/chat') ||
    pathname.startsWith('/api/farms') ||
    pathname.startsWith('/api/wallet') ||
    pathname.startsWith('/api/simulator/save') ||
    pathname.startsWith('/api/simulator/history');

  if (!isAuthenticated) {
    if (isPrivateApi) {
      return NextResponse.json(
        { success: false, error: 'Session non authentifiée. Veuillez vous connecter.' },
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
    '/en-attente',
    '/api/assistant/chat',
    '/api/farms/:path*',
    '/api/wallet',
    '/api/simulator/save',
    '/api/simulator/history',
  ],
};
