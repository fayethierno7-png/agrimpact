import { NextRequest, NextResponse } from 'next/server';
import { signSessionToken, verifySessionToken } from '../../../../lib/auth/sessionSigner';
import { getSupabaseServerClient } from '../../../../lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      email,
      nom,
      statut_compte = 'actif',
      statut_abonnement = 'actif',
      date_limite_grace = null,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Identifiant utilisateur requis.' },
        { status: 400 }
      );
    }

    // SÉCURITÉ : Récupérer le rôle RÉEL depuis la base de données
    // Ne JAMAIS faire confiance au champ 'role' envoyé par le client
    let verifiedRole = 'producteur';
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      // Récupérer le token d'accès pour passer la RLS
      let authHeader = req.headers.get('authorization');
      if (!authHeader) {
        const sbTokenStr = req.cookies.get('sb-xtizlewxnrttymtydqka-auth-token')?.value;
        if (sbTokenStr) {
          try {
            const sbToken = JSON.parse(sbTokenStr);
            if (sbToken?.access_token) {
              authHeader = `Bearer ${sbToken.access_token}`;
            }
          } catch {}
        }
      }

      if (supabaseUrl && supabaseServiceKey) {
        const headers: HeadersInit = { apikey: supabaseServiceKey };
        if (authHeader) headers['Authorization'] = authHeader;
        else headers['Authorization'] = `Bearer ${supabaseServiceKey}`; // Fallback anon

        const res = await fetch(
          `${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=role`,
          {
            headers,
            signal: AbortSignal.timeout(2000),
          }
        );
        if (res.ok) {
          const profiles = await res.json();
          if (profiles?.[0]?.role) {
            verifiedRole = profiles[0].role;
          }
        }
      }
    } catch (e) {
      console.warn('Erreur vérification rôle serveur:', e);
    }

    // Garantie absolue pour le compte propriétaire (côté serveur, inviolable)
    if (email === 'fayethierno7@gmail.com') {
      verifiedRole = 'superadmin';
    }

    const sessionPayload = {
      userId,
      email: email || '',
      nom: nom || '',
      role: verifiedRole,
      statut_compte,
      statut_abonnement,
      date_limite_grace,
      createdAt: new Date().toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      message: 'Session persistante initialisée.',
      session: sessionPayload,
    });

    // Encodage signé cryptographiquement HMAC-SHA256
    const sessionToken = await signSessionToken(sessionPayload);

    // Déposer le cookie de session serveur sécurisé (7 jours)
    response.cookies.set('agri_session', sessionToken, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Cookie de rôle informatif (non suffisant seul pour autoriser l'admin)
    response.cookies.set('agri_user_role', verifiedRole, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur création session.' },
      { status: 500 }
    );
  }
}


export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'Session déconnectée côté serveur.',
  });

  response.cookies.set('agri_session', '', {
    path: '/',
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'lax',
  });

  response.cookies.set('agri_user_role', '', {
    path: '/',
    expires: new Date(0),
    httpOnly: false,
    sameSite: 'lax',
  });

  return response;
}

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('agri_session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }

  const session = await verifySessionToken(sessionCookie);
  if (!session) {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }

  return NextResponse.json({ isAuthenticated: true, session });
}
