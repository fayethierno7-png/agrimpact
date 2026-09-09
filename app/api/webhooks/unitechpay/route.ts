import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase/client';
import { UserPlan } from '../../../../lib/types';
import { verifyWebhookSignature } from '../../../../lib/security/webhookVerifier';

/**
 * Webhook UnitechPay
 * Reçoit les confirmations de paiement en temps réel (Wave, Orange Money, etc.)
 * Endpoint: POST /api/webhooks/unitechpay
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader =
      req.headers.get('x-unitechpay-signature') ||
      req.headers.get('x-webhook-signature') ||
      req.headers.get('signature');

    // Vérification stricte de l'authenticité de l'émetteur
    const verification = verifyWebhookSignature(
      rawBody,
      signatureHeader,
      process.env.UNITECHPAY_WEBHOOK_SECRET
    );

    if (!verification.valid) {
      console.warn('⛔ [SECURITE] Tentative d\'appel Webhook UnitechPay rejetée:', verification.reason);
      return NextResponse.json(
        { error: 'Non autorisé: signature invalide ou absente' },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);

    // Exemple de structure UnitechPay :
    // { "event": "payment_completed", "data": { "transaction_id": "12345", "reference": "AGRI_PRO_usr-123_...", "amount": 2500, "status": "completed" } }
    const { event, data } = body;

    // Accepter payment_completed ou status completed
    const isCompleted =
      event === 'payment_completed' ||
      data?.status === 'completed' ||
      data?.status === 'SUCCESS' ||
      body.status === 'completed';

    if (!isCompleted) {
      return NextResponse.json(
        { received: true, message: 'Événement ignoré (non complété)' },
        { status: 200 }
      );
    }

    const transactionId = data?.transaction_id || data?.id || body.transaction_id || `TX_${Date.now()}`;
    const reference = data?.reference || body.reference || '';
    const amount = Number(data?.amount || body.amount || 2500);

    // Déterminer le forfait et l'utilisateur à partir de la référence
    // Format de référence standard : AGRI_[PLAN]_[USERID]_[TIMESTAMP]
    let plan: UserPlan = 'pro';
    let userId = data?.user_id || body?.user_id || '';

    if (reference.includes('COOPERATIVE') || reference.includes('BUSINESS') || amount >= 10000) {
      plan = 'cooperative';
    } else if (reference.includes('SOLO') || amount < 2000) {
      plan = 'solo';
    } else {
      plan = 'pro';
    }

    // Extraction du userId depuis la référence si présente (format: AGRI_[PLAN]_usr-[USERID]_[TIMESTAMP])
    const refParts = reference.split('_');
    if (refParts.length >= 3 && refParts[2].startsWith('usr-')) {
      userId = refParts[2].replace(/^usr-/, '');
    }

    // Détection du provider (Wave ou Orange Money)
    const provider = reference.toLowerCase().includes('orange') || reference.toLowerCase().includes('om')
      ? 'orange_money'
      : 'wave';

    console.log(`✅ UnitechPay Webhook: Paiement confirmé pour ${userId}, Forfait: ${plan}, Montant: ${amount} FCFA, Réf: ${reference}`);

    // Mise à jour de la base de données PostgreSQL / Supabase
    if (isSupabaseConfigured && supabase) {
      // 0. Protection Idempotence & Race Conditions : vérifier si la transaction a déjà été traitée
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('provider_subscription_id', transactionId)
        .maybeSingle();

      if (existingSub) {
        console.log(`ℹ️ [IDEMPOTENCE] Transaction ${transactionId} déjà enregistrée. Traitement ignoré.`);
        return NextResponse.json(
          {
            status: 'success',
            received: true,
            duplicate: true,
            transaction_id: transactionId,
          },
          { status: 200 }
        );
      }

      // 1. Mettre à jour le plan dans la table profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          plan,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (profileError) {
        console.warn('Erreur mise à jour profil Supabase:', profileError.message);
      }

      // 2. Insérer l'enregistrement de paiement dans la table subscriptions
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Validité de 30 jours

      const { error: subError } = await supabase.from('subscriptions').insert([
        {
          user_id: userId,
          plan,
          statut: 'active',
          provider,
          provider_subscription_id: transactionId,
          montant_cfa: amount,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        },
      ]);

      if (subError) {
        console.warn('Erreur insertion souscription Supabase:', subError.message);
      }
    }

    // Réponse attendue par le webhook UnitechPay
    return NextResponse.json(
      {
        status: 'success',
        received: true,
        transaction_id: transactionId,
        plan,
        userId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Erreur traitement Webhook UnitechPay:', error?.message || 'Erreur inconnue');
    return NextResponse.json(
      { error: 'Erreur interne lors du traitement du paiement' },
      { status: 500 }
    );
  }
}
