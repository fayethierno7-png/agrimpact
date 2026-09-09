import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase/client';
import { isValidId } from '../../../../lib/validation/apiValidators';

export const dynamic = 'force-dynamic';

/**
 * Polling Endpoint for Payment Status
 * GET /api/payments/status?transactionId=...
 */
export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json(
        { error: 'Supabase n\'est pas configuré.' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId || !isValidId(transactionId)) {
      return NextResponse.json(
        { error: 'transactionId manquant ou invalide.' },
        { status: 400 }
      );
    }

    // On vérifie dans la table subscriptions si l'enregistrement a été inséré par le webhook
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, statut, plan, created_at')
      .eq('provider_subscription_id', transactionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found, cela signifie que le webhook n'a pas encore validé le paiement
        return NextResponse.json({ status: 'pending' }, { status: 200 });
      }
      throw error;
    }

    if (data && data.statut === 'active') {
      return NextResponse.json({ status: 'completed', plan: data.plan }, { status: 200 });
    }

    return NextResponse.json({ status: 'pending' }, { status: 200 });
  } catch (error: any) {
    console.error('Erreur lors de la vérification du statut:', error);
    return NextResponse.json(
      { error: 'Erreur interne lors de la vérification du paiement.' },
      { status: 500 }
    );
  }
}
