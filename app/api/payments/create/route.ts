import { NextRequest, NextResponse } from 'next/server';
import {
  createWavePayment,
  createOrangeMoneyPayment,
  createIntlPayment,
} from '../../../../lib/payment/unitechpay';
import { PLAN_LIMITS } from '../../../../lib/billing/planLimits';
import { UserPlan } from '../../../../lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      plan,
      provider = 'wave',
      phoneNumber,
      userId = 'anonymous',
      omMode = 'om',
      country = 'SN',
      operator = 'wave_money',
      otp,
    } = body;

    if (!plan || !['pro', 'business'].includes(plan)) {
      return NextResponse.json(
        { error: 'Forfait invalide. Choisissez "pro" ou "business".' },
        { status: 400 }
      );
    }

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Numéro de téléphone requis pour le paiement mobile.' },
        { status: 400 }
      );
    }

    const planInfo = PLAN_LIMITS[plan as UserPlan];
    const amount = planInfo.priceMonthlyCFA;
    const orderReference = `AGRI_${plan.toUpperCase()}_${userId}_${Date.now()}`;
    const description = `Abonnement AGRIMPACT - Forfait ${planInfo.name} (${amount} FCFA)`;

    // Déterminer l'URL de base pour les callbacks (Wave & OM exigent obligatoirement HTTPS)
    let origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get('origin') ||
      req.nextUrl.origin ||
      'https://agrimpact.sn';

    if (!origin.startsWith('https://')) {
      // En environnement local de dev HTTP, utiliser une URL HTTPS pour satisfaire la validation stricte de Wave
      origin = 'https://agrimpact.sn';
    }

    const callbackSuccess = `${origin}/payment/success?reference=${orderReference}&plan=${plan}&provider=${provider}`;
    const callbackCancel = `${origin}/payment/cancel?reference=${orderReference}&plan=${plan}&provider=${provider}`;

    let result;

    if (country !== 'SN' && provider === 'intl') {
      // Paiement International
      result = await createIntlPayment({
        country,
        operator,
        amount,
        phone: phoneNumber,
        description,
        orderReference,
        callbackSuccess,
        callbackCancel,
        otp,
      });
    } else if (provider === 'orange_money') {
      // Orange Money Sénégal
      result = await createOrangeMoneyPayment(
        {
          amount,
          phone: phoneNumber,
          description,
          orderReference,
          callbackSuccess,
          callbackCancel,
        },
        omMode
      );
    } else {
      // Par défaut : Wave Sénégal
      result = await createWavePayment({
        amount,
        phone: phoneNumber,
        description,
        orderReference,
        callbackSuccess,
        callbackCancel,
      });
    }

    return NextResponse.json({
      success: true,
      amount,
      plan,
      provider,
      orderReference,
      paymentUrl: result.paymentUrl,
      transactionId: result.transactionId,
      isLive: result.isLive,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Erreur API Création Paiement:', error);
    return NextResponse.json(
      { error: error.message || 'Échec de l\'initialisation du paiement' },
      { status: 500 }
    );
  }
}
