import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '../../../../lib/email/sendEmail';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, nom, region, culture, surfaceHa, typeIrrigation } = body;

    if (!email) {
      return NextResponse.json({ error: 'Adresse email obligatoire' }, { status: 400 });
    }

    const result = await sendWelcomeEmail({
      to: email,
      nom: nom || email.split('@')[0] || 'Producteur',
      region: region || 'Sénégal',
      culture: culture || 'Culture maraîchère',
      surfaceHa: surfaceHa || 1.0,
      typeIrrigation: typeIrrigation || 'Goutte-à-goutte',
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
