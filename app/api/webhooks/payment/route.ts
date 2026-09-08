import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase/client';
import { UserPlan } from '../../../../lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

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
    return NextResponse.json(
      { error: error.message || 'Erreur interne du webhook' },
      { status: 500 }
    );
  }
}
