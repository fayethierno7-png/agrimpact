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

    // 1. Envoyer le code à l'utilisateur :
    // D'abord tenter via Supabase Auth OTP natif (qui a un serveur de messagerie relié au projet Supabase)
    let emailSent = false;
    let deliveryMethod = 'none';

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseAnonKey) {
        const sbRes = await fetch(`${supabaseUrl}/auth/v1/otp`, {
          method: 'POST',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: targetEmail,
            create_user: false,
          }),
        });
        if (sbRes.ok) {
          emailSent = true;
          deliveryMethod = 'supabase';
        }
      }
    } catch (e) {
      console.warn('Supabase OTP fetch error:', e);
    }

    // Si Supabase OTP n'a pas abouti, tenter via le transport SMTP configuré
    if (!emailSent) {
      const smtpRes = await sendOtpEmail(targetEmail, code, type, nom);
      if (smtpRes.sent) {
        emailSent = true;
        deliveryMethod = 'smtp';
      }
    }

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

    // Retour honnête : si aucun serveur mail réel n'est connecté, on fournit le code de secours pour permettre le test
    return NextResponse.json({
      success: true,
      emailSent,
      deliveryMethod,
      // Si le mail n'a pas pu être expédié par le réseau SMTP/Supabase, fournir le code de test transparent
      devCode: !emailSent ? code : undefined,
      message: emailSent
        ? `Code de confirmation envoyé à ${targetEmail}.`
        : `Aucun serveur SMTP n'est configuré dans .env.local. Utilisez le code temporaire ci-dessous pour valider votre test.`,
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
