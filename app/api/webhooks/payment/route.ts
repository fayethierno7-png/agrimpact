import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase/client';
import { UserPlan } from '../../../../lib/types';
import { verifyWebhookSignature } from '../../../../lib/security/webhookVerifier';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader =
      req.headers.get('x-payment-signature') ||
      req.headers.get('x-webhook-signature') ||
      req.headers.get('signature');

    const secret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.UNITECHPAY_WEBHOOK_SECRET;
    const verification = verifyWebhookSignature(rawBody, signatureHeader, secret);

    if (!verification.valid) {
      console.warn('⛔ [SECURITE] Webhook paiement rejeté:', verification.reason);
      return NextResponse.json({ error: 'Signature invalide ou absente' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // Payload attendu de Wave ou Orange Money
    // { event: 'payment.completed', provider: 'wave', userId: '...', plan: 'pro', transactionId: '...' }
    const { event, provider, userId, plan, transactionId, amount } = body;

    if (event !== 'payment.completed' || !userId || !plan) {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 });
    }

    const validPlans: UserPlan[] = ['free', 'pro', 'business'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ error: 'Plan non reconnu' }, { status: 400 });
    }

    // Mise à jour de la table subscriptions et du profil
    if (isSupabaseConfigured && supabase) {
      // 1. Mettre à jour le plan dans profiles
      await supabase
        .from('profiles')
        .update({ plan, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      // 2. Insérer ou mettre à jour la souscription
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1); // +1 mois de validité

      await supabase.from('subscriptions').insert([
        {
          user_id: userId,
          plan,
          statut: 'active',
          provider: provider || 'wave',
          provider_subscription_id: transactionId,
          montant_cfa: amount || 2500,
          expires_at: expiresAt.toISOString(),
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      message: `Abonnement ${plan} activé avec succès via ${provider || 'mobile money'}.`,
    });
  } catch (error: any) {
    console.error('Erreur webhook paiement:', error?.message || 'Erreur inconnue');
    return NextResponse.json(
      { error: 'Erreur interne lors du traitement du paiement' },
      { status: 500 }
    );
  }
}
