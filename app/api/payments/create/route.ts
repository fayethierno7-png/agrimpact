import { NextRequest, NextResponse } from 'next/server';
import {
  createWavePayment,
  createOrangeMoneyPayment,
  createIntlPayment,
} from '../../../../lib/payment/unitechpay';
import { PLAN_LIMITS } from '../../../../lib/billing/planLimits';
import { DEFAULT_PLANS, DEFAULT_TOKEN_PACKS } from '../../../../lib/saas/plansData';
import { UserPlan } from '../../../../lib/types';

export const dynamic = 'force-dynamic';

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
      cycle = 'mensuel',
      // On ignore volontairement tout amount envoyé par le frontend par sécurité
    } = body;

    // Normalisation du nom de plan
    const rawPlan = (plan || 'pro').toLowerCase().trim();
    const normalizedPlan = rawPlan.includes('coop')
      ? 'cooperative'
      : rawPlan.includes('solo')
      ? 'solo'
      : rawPlan.includes('business')
      ? 'cooperative'
      : rawPlan.includes('eclair')
      ? 'eclair'
      : rawPlan.includes('recolte') || rawPlan.includes('récolte')
      ? 'recolte'
      : rawPlan.includes('saison')
      ? 'saison'
      : 'pro';

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Numéro de téléphone requis pour le paiement mobile.' },
        { status: 400 }
      );
    }

    // Détermination dynamique et stricte du montant côté serveur
    let amount = 0;
    let planDisplayName = 'Pro Producteur';

    if (['eclair', 'recolte', 'saison'].includes(normalizedPlan)) {
      const pack = DEFAULT_TOKEN_PACKS.find((p) => p.slug === normalizedPlan);
      amount = pack ? pack.prix_fcfa : 1990;
      planDisplayName = pack ? pack.nom : 'Pack de Tokens IA';
    } else {
      const matchingPlan = DEFAULT_PLANS.find((p) => p.slug === normalizedPlan);
      if (matchingPlan) {
        amount = cycle === 'annuel' ? matchingPlan.prix_annuel_fcfa : matchingPlan.prix_mensuel_fcfa;
        planDisplayName = matchingPlan.nom;
      } else {
        const planInfo = PLAN_LIMITS[normalizedPlan as UserPlan] || PLAN_LIMITS.pro;
        amount = planInfo.priceMonthlyCFA;
        planDisplayName = planInfo.name;
      }
    }

    // Génération de référence sécurisée au format attendu par le webhook: AGRI_[PLAN]_[USERID]_[TIMESTAMP]
    const orderReference = `AGRI_${normalizedPlan.toUpperCase()}_usr-${userId}_${Date.now().toString().slice(-6)}`;
    const description = `AgriImpact Sénégal - ${planDisplayName} (${amount} FCFA)`;

    // Résolution précise et robuste du domaine d'origine sur Vercel ou en local
    let origin = '';
    const forwardedHost = req.headers.get('x-forwarded-host');
    const host = forwardedHost || req.headers.get('host');
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    const reqOrigin = req.headers.get('origin');

    if (reqOrigin && reqOrigin.startsWith('https://')) {
      origin = reqOrigin;
    } else if (host) {
      origin = `${forwardedProto}://${host}`;
    } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      origin = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    } else if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
      origin = process.env.NEXT_PUBLIC_APP_URL;
    } else {
      origin = 'https://agrimpact.sn';
    }

    // Retirer tout slash de fin
    origin = origin.replace(/\/+$/, '');

    const callbackSuccess = `${origin}/payment/success?reference=${orderReference}&plan=${normalizedPlan}&provider=${provider}&amount=${amount}`;
    const callbackCancel = `${origin}/payment/cancel?reference=${orderReference}&plan=${normalizedPlan}&provider=${provider}`;

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

    // Si UnitechPay est en mode simulation (ou pas de clé configurée sur Vercel), fournir l'URL de redirection immédiate
    const finalPaymentUrl = result.paymentUrl || `${callbackSuccess}&simulated=true`;

    return NextResponse.json({
      success: true,
      amount,
      plan: normalizedPlan,
      provider,
      orderReference,
      paymentUrl: finalPaymentUrl,
      transactionId: result.transactionId || `TX_${Date.now()}`,
      isLive: result.isLive ?? false,
      message: result.message || 'Paiement initialisé avec succès.',
    });
  } catch (error: any) {
    console.error('Erreur API Création Paiement:', error);
    return NextResponse.json(
      { error: error.message || 'Échec de l\'initialisation du paiement mobile.' },
      { status: 500 }
    );
  }
}
