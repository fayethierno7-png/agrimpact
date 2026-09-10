import { NextRequest, NextResponse } from 'next/server';
import { notifyAdminViaResend } from '../../../../lib/resend';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/notify-login
 * Déclenche une alerte administrateur en tâche de fond lors d'une connexion réussie,
 * sans jamais bloquer ni ralentir l'utilisateur.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { identifier, email, nom, telephone } = body;

    const userEmail = email || (identifier && identifier.includes('@') ? identifier : undefined);
    const userPhone = telephone || (identifier && !identifier.includes('@') ? identifier : undefined);

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'Inconnue';
    const userAgent = req.headers.get('user-agent') || 'Inconnu';

    // Notification admin asynchrone via Resend
    notifyAdminViaResend({
      type: 'connexion',
      userNom: nom,
      userEmail,
      userPhone,
      ip,
      userAgent,
    }).catch((err) => {
      console.warn('Erreur notification admin connexion:', err);
    });

    return NextResponse.json({ success: true, notified: true });
  } catch {
    return NextResponse.json({ success: true, notified: false });
  }
}
