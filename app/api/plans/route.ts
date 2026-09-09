import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase/client';
import { DEFAULT_PLANS, DEFAULT_TOKEN_PACKS } from '../../../lib/saas/plansData';
import { Plan, TokenPack } from '../../../lib/saas/types';

// Cache mémoire serveur (15 minutes)
let cachedPlansData: { plans: Plan[]; tokenPacks: TokenPack[] } | null = null;
let cacheExpiresAt = 0;

export async function GET() {
  try {
    const now = Date.now();
    if (cachedPlansData && now < cacheExpiresAt) {
      return NextResponse.json(
        { success: true, ...cachedPlansData, fromCache: true },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        }
      );
    }

    let plans: Plan[] = DEFAULT_PLANS;
    let tokenPacks: TokenPack[] = DEFAULT_TOKEN_PACKS;

    if (supabase) {
      const [plansRes, packsRes] = await Promise.all([
        supabase
          .from('plans')
          .select('id, nom, prix_mensuel_fcfa, prix_annuel_fcfa, limites, actif')
          .eq('actif', true)
          .order('prix_mensuel_fcfa', { ascending: true }),
        supabase
          .from('token_packs')
          .select('id, nom, prix_fcfa, nb_tokens, actif')
          .eq('actif', true)
          .order('prix_fcfa', { ascending: true }),
      ]);

      if (!plansRes.error && plansRes.data && plansRes.data.length > 0) {
        plans = plansRes.data.map((row: any) => {
          const nom = row.nom;
          const slug = nom.toLowerCase().includes('coop')
            ? 'cooperative'
            : nom.toLowerCase().includes('pro')
            ? 'pro'
            : 'solo';

          const isPro = slug === 'pro';

          return {
            id: row.id,
            nom: row.nom,
            slug,
            badge: isPro ? 'Recommandé Producteurs' : undefined,
            isPopular: isPro,
            description:
              slug === 'solo'
                ? 'Le socle agronomique essentiel pour le producteur individuel autonome.'
                : slug === 'pro'
                ? 'Le copilote agrométéo et prédictif complet pour sécuriser ses rendements.'
                : 'La plateforme de pilotage mutualisée pour groupements et unions paysannes.',
            prix_mensuel_fcfa: row.prix_mensuel_fcfa,
            prix_annuel_fcfa: row.prix_annuel_fcfa,
            limites: {
              max_exploitations: row.limites?.max_exploitations ?? 1,
              max_parcelles: row.limites?.max_parcelles ?? 3,
              historique_meteo_jours: row.limites?.historique_meteo_jours ?? 7,
              projection_jours: row.limites?.projection_jours ?? 0,
              fenetres_pulverisation_mois: row.limites?.fenetres_pulverisation_mois ?? 5,
              max_users: row.limites?.max_users ?? 1,
              alertes_sms_mois: row.limites?.alertes_sms_mois ?? 10,
              tokens_ia_mois: row.limites?.tokens_ia_mois ?? 8000,
            },
            actif: row.actif,
          };
        });
      }

      if (!packsRes.error && packsRes.data && packsRes.data.length > 0) {
        tokenPacks = packsRes.data.map((row: any) => {
          const nom = row.nom;
          const slug = nom.toLowerCase().includes('saison')
            ? 'saison'
            : nom.toLowerCase().includes('récolte') || nom.toLowerCase().includes('recolte')
            ? 'recolte'
            : 'eclair';

          return {
            id: row.id,
            nom: row.nom,
            slug,
            prix_fcfa: row.prix_fcfa,
            nb_tokens: row.nb_tokens,
            description:
              slug === 'eclair'
                ? '~10 diagnostics ou conseils instantanés.'
                : slug === 'recolte'
                ? '~50 messages d’analyse agronomique pointue.'
                : '~150 consultations complètes sur tout le cycle.',
            isPopular: slug === 'recolte',
            actif: row.actif,
          };
        });
      }
    }

    cachedPlansData = { plans, tokenPacks };
    cacheExpiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    return NextResponse.json(
      {
        success: true,
        plans,
        tokenPacks,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (err: any) {
    console.error('Error fetching plans:', err);
    // Fallback gracieux pour ne jamais bloquer l'UI
    return NextResponse.json({
      success: true,
      plans: DEFAULT_PLANS,
      tokenPacks: DEFAULT_TOKEN_PACKS,
      fallback: true,
    });
  }
}
