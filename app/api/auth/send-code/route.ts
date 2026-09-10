import { NextRequest, NextResponse } from 'next/server';
import { generateOtpCode, saveOtp } from '../../../../lib/auth/otpStore';
import { sendOtpViaResend, notifyAdminViaResend } from '../../../../lib/email/resend';
import { rateLimit, getClientIdentifier } from '../../../../lib/security/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    const rateLimitKey = getClientIdentifier(req, 'send_otp');
    const rl = rateLimit(rateLimitKey, 10, 10 * 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: `Trop de demandes. Veuillez patienter ${rl.reset} secondes avant de réessayer.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { identifier, email, nom, telephone, type = 'login' } = body;

    const targetEmail = (email || (identifier && identifier.includes('@') ? identifier : '')).trim().toLowerCase();

    if (!targetEmail) {
      return NextResponse.json(
        { success: false, error: 'Une adresse email valide est requise pour recevoir votre code de confirmation.' },
        { status: 400 }
      );
    }

    // 1. Générer le code OTP sécurisé à 6 chiffres
    const code = generateOtpCode();

    // 2. Stocker le code avec expiration (10 min) et synchronisation en base
    await saveOtp(targetEmail, code, type);

    // 3. Envoyer l'email via Resend
    const resendResult = await sendOtpViaResend({
      to: targetEmail,
      code,
      type,
      nom,
    });

    // 4. Si Resend a échoué (ex: clé API manquante ou invalide), renvoyer une erreur explicite SANS mentir
    if (!resendResult.success) {
      console.error('Échec envoi Resend:', resendResult.error);
      return NextResponse.json(
        {
          success: false,
          error: resendResult.error || "Impossible d'acheminer l'email via Resend. Veuillez vérifier votre configuration.",
        },
        { status: 500 }
      );
    }

    // 5. Notifier l'administrateur en parallèle via Resend
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Inconnu';
    notifyAdminViaResend({
      type: type === 'signup' ? 'nouvelle_inscription' : 'connexion',
      userNom: nom,
      userEmail: targetEmail,
      userPhone: telephone,
      ip,
      userAgent,
    }).catch((err) => console.warn('Erreur notification admin Resend:', err));

    return NextResponse.json({
      success: true,
      message: `Code de confirmation envoyé avec succès à ${targetEmail}.`,
      sentTo: targetEmail.replace(/(.{2})(.*)(?=@)/, '$1***'),
    });
  } catch (err: any) {
    console.error('Erreur API /api/auth/send-code:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur serveur lors de la génération du code.' },
      { status: 500 }
    );
  }
}
