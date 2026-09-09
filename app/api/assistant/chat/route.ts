import { NextRequest, NextResponse } from 'next/server';
import { AGRIMPACT_SYSTEM_PROMPT, generateLocalAgronomicResponse } from '../../../../lib/assistant/systemPrompt';
import { getAuthenticatedUser } from '../../../../lib/auth/serverAuth';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase/client';
import { rateLimit, getClientIdentifier } from '../../../../lib/security/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    // 1. POINT 1 : Authentification obligatoire côté API
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Accès réservé aux comptes connectés. Veuillez vous connecter pour utiliser l\'assistant AgriImpact.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Protection anti-abus / Rate Limiting (20 requêtes par minute par utilisateur)
    const rateLimitKey = getClientIdentifier(req, 'chat', user.id);
    const rlResult = rateLimit(rateLimitKey, 20, 60_000);
    if (!rlResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Trop de requêtes envoyées. Veuillez patienter ${rlResult.reset} secondes.`,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rlResult.reset),
            'X-RateLimit-Limit': String(rlResult.limit),
            'X-RateLimit-Remaining': String(rlResult.remaining),
          },
        }
      );
    }

    // POINT 13 : Vérification du statut de validation du compte
    if (user.statut_compte === 'en_attente') {
      return NextResponse.json(
        {
          success: false,
          error: 'Votre compte est en attente de validation par un administrateur AgriImpact.',
          code: 'ACCOUNT_PENDING',
        },
        { status: 403 }
      );
    }

    // POINT 11 : Coupure si abonnement expiré après la période de grâce
    if (user.statut_abonnement === 'expire' || user.statut_compte === 'suspendu') {
      return NextResponse.json(
        {
          success: false,
          error: 'Votre abonnement est expiré. Veuillez régulariser votre souscription pour utiliser l\'assistant.',
          code: 'SUBSCRIPTION_EXPIRED',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { messages, conversationId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Historique de messages obligatoire.' },
        { status: 400 }
      );
    }

    // 2. POINTS 4 & 12 : Vérification du solde de tokens IA en base de données
    const TOKENS_PER_QUERY = 500;
    let tokensQuotaRestants = 0;
    let tokensPayantsRestants = 0;
    let walletId: string | null = null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: wallet, error: walletErr } = await supabase
          .from('ai_token_wallets')
          .select('id, tokens_quota_mensuel_restants, tokens_payants_restants')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!walletErr && wallet) {
          walletId = wallet.id;
          tokensQuotaRestants = Number(wallet.tokens_quota_mensuel_restants || 0);
          tokensPayantsRestants = Number(wallet.tokens_payants_restants || 0);
        } else if (!wallet) {
          // Initialiser un portefeuille par défaut si non existant (ex: 8000 tokens du plan initial)
          const { data: newWallet } = await supabase
            .from('ai_token_wallets')
            .insert({
              user_id: user.id,
              tokens_quota_mensuel_restants: 8000,
              tokens_payants_restants: 0,
            })
            .select('id, tokens_quota_mensuel_restants, tokens_payants_restants')
            .maybeSingle();

          if (newWallet) {
            walletId = newWallet.id;
            tokensQuotaRestants = Number(newWallet.tokens_quota_mensuel_restants || 8000);
            tokensPayantsRestants = Number(newWallet.tokens_payants_restants || 0);
          }
        }
      } catch (errDb) {
        console.warn('Vérification DB wallet:', errDb);
      }
    }

    const totalAvailable = tokensQuotaRestants + tokensPayantsRestants;

    // POINT 12 : Blocage strict à 0 token restant côté API
    if (totalAvailable <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Solde de tokens épuisé. Renouvellement au prochain cycle ou rechargez un pack pour continuer.',
          code: 'TOKENS_EXHAUSTED',
          balance: 0,
          tokensRemaining: 0,
          permanentTokens: 0,
        },
        { status: 402 }
      );
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const groqKey = process.env.GROQ_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    let reply = '';
    let usedProvider = 'agrimpact-expert-engine';
    let usedModel = 'agrimpact-agronomy-v1';

    // 3. POINT 15 : Modèles Groq valides (Llama 3.3 70B & Llama 3.1 8B)
    if (groqKey) {
      const preferredModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
      for (const groqModel of preferredModels) {
        try {
          const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: groqModel,
              messages: [
                { role: 'system', content: AGRIMPACT_SYSTEM_PROMPT },
                ...messages.map((m: any) => ({
                  role: m.role === 'user' ? 'user' : 'assistant',
                  content: m.content,
                })),
              ],
              temperature: 0.4,
              max_tokens: 1200,
            }),
            signal: AbortSignal.timeout(8000),
          });

          if (groqResponse.ok) {
            const data = await groqResponse.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) {
              reply = content.trim();
              usedProvider = 'groq';
              usedModel = groqModel;
              break;
            }
          }
        } catch (groqErr) {
          console.warn(`Tentative Groq (${groqModel}) échouée ou timeout:`, groqErr);
        }
      }
    }

    // Repli OpenAI si Groq indisponible
    if (!reply && openAiKey) {
      try {
        const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: AGRIMPACT_SYSTEM_PROMPT },
              ...messages.map((m: any) => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content,
              })),
            ],
            temperature: 0.4,
            max_tokens: 1024,
          }),
          signal: AbortSignal.timeout(8000),
        });

        if (openAiResponse.ok) {
          const data = await openAiResponse.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            reply = content.trim();
            usedProvider = 'openai';
            usedModel = 'gpt-4o-mini';
          }
        }
      } catch (openAiErr) {
        console.warn('Tentative OpenAI échouée:', openAiErr);
      }
    }

    // Repli Moteur Agronomique Local si aucune API externe
    if (!reply) {
      reply = generateLocalAgronomicResponse(lastUserMessage);
    }

    // 4. POINT 4 : Déduction des tokens en base de données et enregistrement de l'historique
    let newQuota = tokensQuotaRestants;
    let newPack = tokensPayantsRestants;
    const tokensDeducted = Math.min(TOKENS_PER_QUERY, totalAvailable);

    if (newQuota >= tokensDeducted) {
      newQuota -= tokensDeducted;
    } else {
      const remainder = tokensDeducted - newQuota;
      newQuota = 0;
      newPack = Math.max(0, newPack - remainder);
    }

    if (isSupabaseConfigured && supabase && walletId) {
      try {
        // Décrémenter le wallet
        await supabase
          .from('ai_token_wallets')
          .update({
            tokens_quota_mensuel_restants: newQuota,
            tokens_payants_restants: newPack,
            updated_at: new Date().toISOString(),
          })
          .eq('id', walletId);

        // Insérer le log de consommation
        await supabase.from('ai_usage_logs').insert({
          user_id: user.id,
          conversation_id: conversationId || null,
          tokens_consommes: tokensDeducted,
          source: tokensQuotaRestants >= tokensDeducted ? 'quota_mensuel' : (tokensQuotaRestants > 0 ? 'mixte' : 'pack_payant'),
          cout_groq_estime: usedProvider === 'groq' ? 0.00015 : 0.0,
        });
      } catch (errLog) {
        console.warn('Erreur mise à jour tokens DB:', errLog);
      }
    }

    // POINT 7 : Horodatage précis retourné
    const createdAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      reply,
      provider: usedProvider,
      model: usedModel,
      created_at: createdAt,
      tokensRemaining: newQuota,
      permanentTokens: newPack,
      tokensDeducted,
    });
  } catch (error: any) {
    console.error('Erreur API Assistant AgriImpact:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur interne lors du traitement de votre question.',
        details: error?.message || 'Erreur inconnue',
      },
      { status: 500 }
    );
  }
}
