import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '../../../../lib/auth/otpStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, email, code } = body;

    const targetEmail = (email || (identifier && identifier.includes('@') ? identifier : '')).trim().toLowerCase();

    if (!targetEmail || !code) {
      return NextResponse.json(
        { success: false, error: 'Email et code de confirmation requis.' },
        { status: 400 }
      );
    }

    const verification = await verifyOtp(targetEmail, code);

    if (!verification.valid) {
      return NextResponse.json(
        { success: false, error: verification.error || 'Code invalide.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Code vérifié avec succès.',
    });
  } catch (err: any) {
    console.error('Erreur verify-code:', err);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la vérification du code.' },
      { status: 500 }
    );
  }
}
