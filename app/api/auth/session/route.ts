import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      role = 'producteur',
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

    const sessionPayload = {
      userId,
      email: email || '',
      nom: nom || '',
      role,
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

    // Encodage base64 léger et propre pour le cookie de session httpOnly
    const sessionToken = Buffer.from(JSON.stringify(sessionPayload)).toString('base64url');

    // Déposer le cookie de session serveur sécurisé (7 jours)
    response.cookies.set('agri_session', sessionToken, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Cookie de rôle informatif (non suffisant seul pour autoriser l'admin)
    response.cookies.set('agri_user_role', role, {
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

  try {
    const raw = Buffer.from(sessionCookie, 'base64url').toString('utf-8');
    const session = JSON.parse(raw);
    return NextResponse.json({ isAuthenticated: true, session });
  } catch {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }
}
