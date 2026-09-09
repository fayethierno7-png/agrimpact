import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '../../../../lib/email/sendEmail';
import { rateLimit, getClientIdentifier } from '../../../../lib/security/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    // Limitation de débit par IP : max 5 envois par tranche de 10 minutes
    const rateLimitKey = getClientIdentifier(req, 'welcome_email');
    const rlResult = rateLimit(rateLimitKey, 5, 10 * 60_000);
    if (!rlResult.success) {
      return NextResponse.json(
        { error: `Trop de requêtes. Veuillez patienter ${rlResult.reset} secondes avant de réessayer.` },
        {
          status: 429,
          headers: {
            'Retry-After': String(rlResult.reset),
          },
        }
      );
    }

    const body = await req.json();
    const { email, nom, region, culture, surfaceHa, typeIrrigation } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Adresse email valide obligatoire' }, { status: 400 });
    }

    const result = await sendWelcomeEmail({
      to: email.trim().toLowerCase(),
      nom: nom || email.split('@')[0] || 'Producteur',
      region: region || 'Sénégal',
      culture: culture || 'Culture maraîchère',
      surfaceHa: surfaceHa || 1.0,
      typeIrrigation: typeIrrigation || 'Goutte-à-goutte',
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erreur send-welcome-email:', error?.message || 'Erreur inconnue');
    return NextResponse.json({ error: 'Erreur lors de l\'envoi de l\'email' }, { status: 500 });
  }
}
