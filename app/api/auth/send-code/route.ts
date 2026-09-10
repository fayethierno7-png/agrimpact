import { NextRequest, NextResponse } from 'next/server';
import { generateOtpCode, saveOtp, sendOtpEmail, notifyAdminAuthAttempt } from '../../../../lib/auth/otpStore';
import { rateLimit, getClientIdentifier } from '../../../../lib/security/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    const rateLimitKey = getClientIdentifier(req, 'send_otp');
    const rl = rateLimit(rateLimitKey, 10, 10 * 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: `Trop de demandes. Réessayez dans ${rl.reset}s.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { identifier, email, nom, telephone, type = 'login' } = body;

    const targetEmail = (email || (identifier && identifier.includes('@') ? identifier : '')).trim().toLowerCase();

    if (!targetEmail) {
      return NextResponse.json(
        { success: false, error: 'Une adresse email valide est requise pour recevoir le code de sécurité.' },
        { status: 400 }
      );
    }

    const code = generateOtpCode();
    saveOtp(targetEmail, code, type);

    // 1. Envoyer le code à l'utilisateur
    await sendOtpEmail(targetEmail, code, type, nom);

    // 2. Notifier en temps réel l'administrateur
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Inconnu';
    notifyAdminAuthAttempt({
      type: type === 'signup' ? 'nouvelle_inscription' : 'connexion',
      userNom: nom,
      userEmail: targetEmail,
      userPhone: telephone,
      ip,
      userAgent,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Code de confirmation envoyé à ${targetEmail}.`,
      // En dev local, on transmet l'email masqué
      sentTo: targetEmail.replace(/(.{2})(.*)(?=@)/, '$1***'),
    });
  } catch (err: any) {
    console.error('Erreur send-otp:', err);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération du code de confirmation.' },
      { status: 500 }
    );
  }
}
