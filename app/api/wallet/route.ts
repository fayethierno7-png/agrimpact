import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '../../../lib/auth/serverAuth';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase/client';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié.' },
        { status: 401 }
      );
    }

    let tokensQuotaRestants = 8000;
    let monthlyQuota = 8000;
    let tokensPayantsRestants = 0;
    let lastReset = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      // 1. Lire le portefeuille utilisateur
      const { data: wallet } = await supabase
        .from('ai_token_wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (wallet) {
        tokensQuotaRestants = Number(wallet.tokens_quota_mensuel_restants ?? 8000);
        tokensPayantsRestants = Number(wallet.tokens_payants_restants ?? 0);
        lastReset = wallet.derniere_reinitialisation || wallet.updated_at || lastReset;
      } else {
        // Créer portefeuille initial si non existant
        await supabase.from('ai_token_wallets').insert({
          user_id: user.id,
          tokens_quota_mensuel_restants: 8000,
          tokens_payants_restants: 0,
        });
      }

      // 2. Lire le plan actif pour déterminer le quota total
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plans (nom, limites)')
        .eq('user_id', user.id)
        .eq('statut', 'actif')
        .maybeSingle();

      if (sub && sub.plans) {
        const planObj = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
        const limits = (planObj as any)?.limites;
        if (limits?.tokens_ia_mois) {
          monthlyQuota = Number(limits.tokens_ia_mois);
        }
      }

      // 3. Lire l'historique récent de consommation
      const { data: logs } = await supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Calcul des stats d'usage
      const recentLogs = logs || [];
      const totalConsumedInLogs = recentLogs.reduce((acc, l) => acc + (l.tokens_consommes || 0), 0);
      const avgPerQuery = recentLogs.length > 0 ? Math.round(totalConsumedInLogs / recentLogs.length) : 500;

      const totalAvailable = tokensQuotaRestants + tokensPayantsRestants;
      const estimatedQuestionsRemaining = Math.max(0, Math.floor(totalAvailable / 500));

      return NextResponse.json({
        success: true,
        wallet: {
          tokensRemaining: tokensQuotaRestants,
          monthlyQuota,
          permanentTokens: tokensPayantsRestants,
          totalAvailable,
          lastReset,
        },
        diagnostic: {
          estimatedQuestionsRemaining,
          avgPerQuery,
          recentLogs: recentLogs.map((l) => ({
            id: l.id,
            date: l.created_at,
            tokensConsommes: l.tokens_consommes,
            source: l.source,
          })),
        },
      });
    }

    return NextResponse.json({
      success: true,
      wallet: {
        tokensRemaining: 8000,
        monthlyQuota: 8000,
        permanentTokens: 0,
        totalAvailable: 8000,
        lastReset,
      },
      diagnostic: {
        estimatedQuestionsRemaining: 16,
        avgPerQuery: 500,
        recentLogs: [],
      },
    });
  } catch (error: any) {
    console.error('Erreur API Wallet:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du portefeuille.' },
      { status: 500 }
    );
  }
}
