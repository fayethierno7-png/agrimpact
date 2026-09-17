import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as anonClient, isSupabaseConfigured } from '../../../../lib/supabase/client';
import { UserPlan } from '../../../../lib/types';
import { verifyWebhookSignature } from '../../../../lib/security/webhookVerifier';

// Voir app/api/webhooks/unitechpay/route.ts : plan/role/statut_compte/essai_expire_le
// sont verrouillés en base contre toute écriture hors clé service_role.
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return anonClient;
}

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
    if (isSupabaseConfigured) {
      const supabase = getServiceClient();
      // 0. Protection Idempotence & Race Conditions
      if (transactionId) {
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('provider_subscription_id', transactionId)
          .maybeSingle();

        if (existingSub) {
          return NextResponse.json({
            success: true,
            duplicate: true,
            message: 'Transaction déjà enregistrée.',
          });
        }
      }

      // 1. Mettre à jour le plan et la date d'expiration dans profiles
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1); // +1 mois de validité

      await supabase
        .from('profiles')
        .update({
          plan,
          abonnement_expire_le: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      // 2. Insérer ou mettre à jour la souscription

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
