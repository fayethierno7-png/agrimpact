-- =============================================================================
-- AGRIMPACT : SCHÉMA COMPLET PRODUCTION (FACTURATION, LIMITES, IA & PARCELLES)
-- Migration du 2026-09-08 — Version blindée (pas de BEGIN/COMMIT)
-- =============================================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. DIAGNOSTIC & CORRECTION DE profiles
--    S'assure que user_id ET role existent dans la table profiles,
--    quel que soit le schéma initial déployé.
-- =============================================================================
DO $$
BEGIN
    -- Vérifier que la table profiles existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        -- Créer la table profiles si elle n'existe pas du tout
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            nom TEXT DEFAULT '',
            telephone_contact TEXT,
            role TEXT DEFAULT 'producteur',
            statut_compte TEXT DEFAULT 'actif',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        -- La table existe : ajouter les colonnes manquantes
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
        ) THEN
            ALTER TABLE public.profiles ADD COLUMN user_id UUID;
            -- Remplir user_id à partir de id pour les lignes existantes (pattern Supabase standard)
            UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
        ) THEN
            ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'producteur';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'statut_compte'
        ) THEN
            ALTER TABLE public.profiles ADD COLUMN statut_compte TEXT DEFAULT 'actif';
        END IF;
    END IF;
END $$;

-- =============================================================================
-- 2. DIAGNOSTIC & CORRECTION DE farms
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'farms'
    ) THEN
        CREATE TABLE public.farms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            nom TEXT NOT NULL,
            region TEXT NOT NULL DEFAULT 'Dakar',
            latitude DOUBLE PRECISION NOT NULL DEFAULT 14.7910,
            longitude DOUBLE PRECISION NOT NULL DEFAULT -16.9256,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'farms' AND column_name = 'user_id'
        ) THEN
            ALTER TABLE public.farms ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- =============================================================================
-- 3. DIAGNOSTIC & CORRECTION DE plots
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'plots'
    ) THEN
        CREATE TABLE public.plots (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
            nom TEXT NOT NULL DEFAULT 'Parcelle 1',
            culture TEXT NOT NULL DEFAULT 'Oignon',
            surface_ha NUMERIC(6, 2) NOT NULL DEFAULT 1.0,
            date_semis DATE NOT NULL DEFAULT CURRENT_DATE,
            type_irrigation TEXT NOT NULL DEFAULT 'goutte-a-goutte',
            variete TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'plots' AND column_name = 'farm_id'
        ) THEN
            ALTER TABLE public.plots ADD COLUMN farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- =============================================================================
-- 4. TABLES FACTURATION & IA (Nouvelles)
-- =============================================================================

-- 4.1. Plans d'abonnement
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL UNIQUE,
    prix_mensuel_fcfa INTEGER NOT NULL CHECK (prix_mensuel_fcfa > 0),
    prix_annuel_fcfa INTEGER NOT NULL CHECK (prix_annuel_fcfa > 0),
    limites JSONB NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.2. Souscriptions — ajout des colonnes manquantes si la table existe déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
    ) THEN
        CREATE TABLE public.subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
            plan_id UUID REFERENCES public.plans(id) ON DELETE RESTRICT,
            statut TEXT NOT NULL DEFAULT 'actif',
            cycle TEXT NOT NULL DEFAULT 'mensuel',
            date_debut TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            date_fin TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
            date_renouvellement TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
            date_limite_grace TIMESTAMPTZ,
            mode_paiement TEXT NOT NULL DEFAULT 'wave',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    ELSE
        -- Ajouter les colonnes manquantes une par une
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='plan_id') THEN
            ALTER TABLE public.subscriptions ADD COLUMN plan_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='cycle') THEN
            ALTER TABLE public.subscriptions ADD COLUMN cycle TEXT DEFAULT 'mensuel';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='date_fin') THEN
            ALTER TABLE public.subscriptions ADD COLUMN date_fin TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='date_renouvellement') THEN
            ALTER TABLE public.subscriptions ADD COLUMN date_renouvellement TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='date_limite_grace') THEN
            ALTER TABLE public.subscriptions ADD COLUMN date_limite_grace TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='mode_paiement') THEN
            ALTER TABLE public.subscriptions ADD COLUMN mode_paiement TEXT DEFAULT 'wave';
        END IF;
    END IF;
END $$;

-- CHECK strict sur subscriptions.statut
DO $$ BEGIN
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_statut_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_statut_check
        CHECK (statut IN ('actif', 'impaye', 'expire', 'annule', 'active'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4.3. Compteurs d'utilisation par cycle
CREATE TABLE IF NOT EXISTS public.usage_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    date_debut_cycle TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_fin_cycle TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
    parcelles_utilisees INTEGER NOT NULL DEFAULT 0 CHECK (parcelles_utilisees >= 0),
    alertes_sms_envoyees INTEGER NOT NULL DEFAULT 0 CHECK (alertes_sms_envoyees >= 0),
    fenetres_pulverisation_utilisees INTEGER NOT NULL DEFAULT 0 CHECK (fenetres_pulverisation_utilisees >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.4. Portefeuille de tokens IA Groq
CREATE TABLE IF NOT EXISTS public.ai_token_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    tokens_quota_mensuel_restants BIGINT NOT NULL DEFAULT 0 CHECK (tokens_quota_mensuel_restants >= 0),
    tokens_payants_restants BIGINT NOT NULL DEFAULT 0 CHECK (tokens_payants_restants >= 0),
    derniere_reinitialisation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.5. Catalogue des packs de tokens
CREATE TABLE IF NOT EXISTS public.token_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL UNIQUE,
    prix_fcfa INTEGER NOT NULL CHECK (prix_fcfa > 0),
    nb_tokens BIGINT NOT NULL CHECK (nb_tokens > 0),
    actif BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.6. Achats de packs de tokens (N'expirent JAMAIS)
CREATE TABLE IF NOT EXISTS public.token_pack_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pack_id UUID NOT NULL REFERENCES public.token_packs(id) ON DELETE RESTRICT,
    payment_reference TEXT,
    tokens_achetes BIGINT NOT NULL CHECK (tokens_achetes > 0),
    tokens_restants BIGINT NOT NULL CHECK (tokens_restants >= 0),
    date_achat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.7. Logs de consommation IA Groq
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id TEXT,
    tokens_consommes INTEGER NOT NULL CHECK (tokens_consommes > 0),
    source TEXT NOT NULL CHECK (source IN ('quota_mensuel', 'pack_payant', 'mixte')),
    cout_groq_estime NUMERIC(10, 6) DEFAULT 0.000000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.8. Paiements Mobile Money
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'payments'
    ) THEN
        CREATE TABLE public.payments (
            id BIGSERIAL PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
            montant INTEGER NOT NULL DEFAULT 0,
            type TEXT NOT NULL DEFAULT 'abonnement',
            mode TEXT NOT NULL DEFAULT 'wave',
            statut TEXT NOT NULL DEFAULT 'en_attente',
            reference_transaction TEXT UNIQUE,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;
END $$;

-- =============================================================================
-- 5. INDEX DE PERFORMANCE
-- =============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='farms' AND column_name='user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_farms_user ON public.farms(user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='plots' AND column_name='farm_id') THEN
        CREATE INDEX IF NOT EXISTS idx_plots_farm ON public.plots(farm_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sub_user_statut ON public.subscriptions(user_id, statut);
CREATE INDEX IF NOT EXISTS idx_sub_grace ON public.subscriptions(statut, date_limite_grace);
CREATE INDEX IF NOT EXISTS idx_usage_user ON public.usage_counters(user_id, date_debut_cycle, date_fin_cycle);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.ai_token_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON public.ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pack_purchases_user ON public.token_pack_purchases(user_id, tokens_restants);

-- =============================================================================
-- 6. FONCTIONS MÉTIER & TRIGGERS
-- =============================================================================

-- 6.0. is_admin() — Utilise EXECUTE dynamique pour ne JAMAIS planter sur une colonne manquante
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result BOOLEAN := false;
    v_has_user_id BOOLEAN;
BEGIN
    -- Détection dynamique : profiles a-t-il une colonne user_id ?
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
    ) INTO v_has_user_id;

    IF v_has_user_id THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = $1 AND role = ''admin'')'
        INTO v_result USING auth.uid();
    ELSE
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = $1 AND role = ''admin'')'
        INTO v_result USING auth.uid();
    END IF;

    RETURN COALESCE(v_result, false);
END;
$$;

-- 6.1. Contrôle d'état de l'abonnement & délai de grâce de 3 jours
CREATE OR REPLACE FUNCTION public.check_user_subscription_status(p_user_id UUID)
RETURNS TABLE (
    sub_id UUID,
    sub_statut TEXT,
    sub_date_fin TIMESTAMPTZ,
    sub_date_limite_grace TIMESTAMPTZ,
    plan_nom TEXT,
    plan_limites JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.statut, s.date_fin, s.date_limite_grace, p.nom, p.limites
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.user_id = p_user_id
      AND s.statut NOT IN ('annule', 'expire')
    ORDER BY s.created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = p_user_id) THEN
            RAISE EXCEPTION 'ABONNEMENT_INACTIF: Votre abonnement est expiré ou annulé. Veuillez renouveler.'
                USING ERRCODE = 'P0002';
        ELSE
            RAISE EXCEPTION 'AUCUN_ABONNEMENT: Aucun abonnement souscrit pour cet utilisateur.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;
END;
$$;

-- 6.2. Vérification du plafond de parcelles (RÉFÉRENCE FIXE sur public.plots)
CREATE OR REPLACE FUNCTION public.check_can_add_parcelle(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sub RECORD;
    v_max_parcelles INTEGER;
    v_current_parcelles INTEGER;
BEGIN
    SELECT * INTO v_sub
    FROM public.check_user_subscription_status(p_user_id)
    LIMIT 1;

    IF v_sub IS NULL OR v_sub.plan_limites IS NULL THEN
        RAISE EXCEPTION 'ABONNEMENT_INVALIDE: Impossible de déterminer les limites du plan.'
            USING ERRCODE = 'P0010';
    END IF;

    IF NOT (v_sub.plan_limites ? 'max_parcelles') THEN
        RAISE EXCEPTION 'CONFIG_PLAN_INVALIDE: Limite max_parcelles absente du plan %.',
            COALESCE(v_sub.plan_nom, '?')
            USING ERRCODE = 'P0011';
    END IF;

    v_max_parcelles := (v_sub.plan_limites->>'max_parcelles')::INTEGER;

    IF v_sub.sub_statut = 'impaye' THEN
        IF v_sub.sub_date_limite_grace IS NULL OR NOW() > v_sub.sub_date_limite_grace THEN
            RAISE EXCEPTION 'PERIODE_GRACE_EXPIREE: Accès suspendu (grâce de 3 jours échue).'
                USING ERRCODE = 'P0003';
        END IF;
    END IF;

    -- Comptage strict et direct sur public.plots via public.farms
    SELECT COUNT(pl.id)
    INTO v_current_parcelles
    FROM public.plots pl
    INNER JOIN public.farms f ON f.id = pl.farm_id
    WHERE f.user_id = p_user_id;

    IF v_current_parcelles IS NULL THEN
        RAISE EXCEPTION 'ERREUR_COMPTAGE_PARCELLES: Impossible de compter les parcelles existantes.'
            USING ERRCODE = 'P0012';
    END IF;

    IF v_current_parcelles >= v_max_parcelles THEN
        RAISE EXCEPTION 'PLAFOND_PARCELLES_ATTEINT: Le forfait % autorise maximum % parcelles (actuellement: %). Passez au palier supérieur.',
            COALESCE(v_sub.plan_nom, '?'), v_max_parcelles, v_current_parcelles
            USING ERRCODE = 'P0004';
    END IF;

    RETURN TRUE;
END;
$$;

-- Trigger BEFORE INSERT sur public.plots
CREATE OR REPLACE FUNCTION public.trigger_check_parcelle_ceiling()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    SELECT user_id INTO v_owner_id FROM public.farms WHERE id = NEW.farm_id;

    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'EXPLOITATION_INTROUVABLE: L exploitation (farm_id: %) n existe pas.', NEW.farm_id
            USING ERRCODE = 'P0013';
    END IF;

    PERFORM public.check_can_add_parcelle(v_owner_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_parcelle_ceiling ON public.plots;
CREATE TRIGGER trg_check_parcelle_ceiling
BEFORE INSERT ON public.plots
FOR EACH ROW
EXECUTE FUNCTION public.trigger_check_parcelle_ceiling();

-- 6.3. Débit de tokens IA Groq (Quota mensuel -> packs permanents -> erreur)
CREATE OR REPLACE FUNCTION public.consume_ai_tokens(
    p_user_id UUID,
    p_tokens_requis INTEGER,
    p_conversation_id TEXT DEFAULT NULL,
    p_cout_groq_estime NUMERIC DEFAULT 0.000000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet RECORD;
    v_tokens_from_quota BIGINT := 0;
    v_tokens_from_pack BIGINT := 0;
    v_token_source TEXT;
    v_pack_purchase RECORD;
    v_to_deduct_from_packs BIGINT;
BEGIN
    IF p_tokens_requis <= 0 THEN
        RAISE EXCEPTION 'ARGUMENT_INVALIDE: Le nombre de tokens requis doit être > 0.'
            USING ERRCODE = 'P0005';
    END IF;

    PERFORM public.check_user_subscription_status(p_user_id);

    SELECT * INTO v_wallet
    FROM public.ai_token_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet.id IS NULL THEN
        RAISE EXCEPTION 'WALLET_INTROUVABLE: Aucun portefeuille de tokens IA pour cet utilisateur.'
            USING ERRCODE = 'P0006';
    END IF;

    IF (v_wallet.tokens_quota_mensuel_restants + v_wallet.tokens_payants_restants) < p_tokens_requis THEN
        RAISE EXCEPTION 'SOLDE_TOKENS_INSUFFISANT: Solde (% mensuels + % packs) insuffisant pour % tokens.',
            v_wallet.tokens_quota_mensuel_restants, v_wallet.tokens_payants_restants, p_tokens_requis
            USING ERRCODE = 'P0007';
    END IF;

    IF v_wallet.tokens_quota_mensuel_restants >= p_tokens_requis THEN
        v_tokens_from_quota := p_tokens_requis;
        v_tokens_from_pack := 0;
        v_token_source := 'quota_mensuel';
    ELSE
        v_tokens_from_quota := v_wallet.tokens_quota_mensuel_restants;
        v_tokens_from_pack := p_tokens_requis - v_tokens_from_quota;
        v_token_source := CASE WHEN v_tokens_from_quota > 0 THEN 'mixte' ELSE 'pack_payant' END;
    END IF;

    UPDATE public.ai_token_wallets
    SET tokens_quota_mensuel_restants = tokens_quota_mensuel_restants - v_tokens_from_quota,
        tokens_payants_restants = tokens_payants_restants - v_tokens_from_pack,
        updated_at = NOW()
    WHERE id = v_wallet.id;

    IF v_tokens_from_pack > 0 THEN
        v_to_deduct_from_packs := v_tokens_from_pack;
        FOR v_pack_purchase IN
            SELECT id, tokens_restants
            FROM public.token_pack_purchases
            WHERE user_id = p_user_id AND tokens_restants > 0
            ORDER BY date_achat ASC
            FOR UPDATE
        LOOP
            IF v_pack_purchase.tokens_restants >= v_to_deduct_from_packs THEN
                UPDATE public.token_pack_purchases
                SET tokens_restants = tokens_restants - v_to_deduct_from_packs
                WHERE id = v_pack_purchase.id;
                EXIT;
            ELSE
                v_to_deduct_from_packs := v_to_deduct_from_packs - v_pack_purchase.tokens_restants;
                UPDATE public.token_pack_purchases
                SET tokens_restants = 0
                WHERE id = v_pack_purchase.id;
            END IF;
        END LOOP;
    END IF;

    INSERT INTO public.ai_usage_logs (
        user_id, conversation_id, tokens_consommes, source, cout_groq_estime, created_at
    ) VALUES (
        p_user_id, p_conversation_id, p_tokens_requis, v_token_source, p_cout_groq_estime, NOW()
    );

    RETURN jsonb_build_object(
        'succes', true,
        'tokens_consommes', p_tokens_requis,
        'source', v_token_source,
        'quota_mensuel_restant', v_wallet.tokens_quota_mensuel_restants - v_tokens_from_quota,
        'pack_payant_restant', v_wallet.tokens_payants_restants - v_tokens_from_pack
    );
END;
$$;

-- 6.4. Renouvellement de cycle
CREATE OR REPLACE FUNCTION public.renew_subscription_cycle(p_subscription_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sub RECORD;
    v_plan RECORD;
    v_tokens_mensuels BIGINT := 8000;
    v_nouveau_debut TIMESTAMPTZ;
    v_nouveau_fin TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id FOR UPDATE;
    IF NOT FOUND THEN RETURN; END IF;

    SELECT * INTO v_plan FROM public.plans WHERE id = v_sub.plan_id;
    IF v_plan.id IS NOT NULL THEN
        v_tokens_mensuels := COALESCE((v_plan.limites->>'tokens_ia_mois')::BIGINT, 8000);
    END IF;

    v_nouveau_debut := NOW();
    v_nouveau_fin := CASE
        WHEN v_sub.cycle = 'annuel' THEN v_nouveau_debut + INTERVAL '1 year'
        ELSE v_nouveau_debut + INTERVAL '1 month'
    END;

    UPDATE public.subscriptions
    SET date_debut = v_nouveau_debut,
        date_fin = v_nouveau_fin,
        date_renouvellement = v_nouveau_fin,
        statut = 'actif',
        date_limite_grace = NULL,
        updated_at = NOW()
    WHERE id = p_subscription_id;

    INSERT INTO public.usage_counters (
        user_id, subscription_id, date_debut_cycle, date_fin_cycle,
        parcelles_utilisees, alertes_sms_envoyees, fenetres_pulverisation_utilisees
    ) VALUES (
        v_sub.user_id, v_sub.id, v_nouveau_debut, v_nouveau_fin, 0, 0, 0
    );

    INSERT INTO public.ai_token_wallets (
        user_id, tokens_quota_mensuel_restants, tokens_payants_restants,
        derniere_reinitialisation, updated_at
    ) VALUES (
        v_sub.user_id, v_tokens_mensuels, 0, NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET tokens_quota_mensuel_restants = v_tokens_mensuels,
        derniere_reinitialisation = NOW(),
        updated_at = NOW();
END;
$$;

-- 6.5. Trigger grâce automatique 3 jours
CREATE OR REPLACE FUNCTION public.trigger_on_subscription_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.statut = 'impaye' AND (OLD.statut IS DISTINCT FROM 'impaye' OR NEW.date_limite_grace IS NULL) THEN
        NEW.date_limite_grace := NOW() + INTERVAL '3 days';
    ELSIF NEW.statut = 'actif' THEN
        NEW.date_limite_grace := NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_lifecycle ON public.subscriptions;
CREATE TRIGGER trg_subscription_lifecycle
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_on_subscription_update();

-- 6.6. Crédit d'un pack de tokens acheté
CREATE OR REPLACE FUNCTION public.credit_purchased_token_pack(
    p_user_id UUID,
    p_pack_id UUID,
    p_payment_reference TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pack RECORD;
BEGIN
    SELECT * INTO v_pack FROM public.token_packs WHERE id = p_pack_id AND actif = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pack de tokens introuvable ou inactif.';
    END IF;

    INSERT INTO public.token_pack_purchases (
        user_id, pack_id, payment_reference, tokens_achetes, tokens_restants, date_achat
    ) VALUES (
        p_user_id, p_pack_id, p_payment_reference, v_pack.nb_tokens, v_pack.nb_tokens, NOW()
    );

    INSERT INTO public.ai_token_wallets (
        user_id, tokens_quota_mensuel_restants, tokens_payants_restants,
        derniere_reinitialisation, updated_at
    ) VALUES (
        p_user_id, 0, v_pack.nb_tokens, NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET tokens_payants_restants = ai_token_wallets.tokens_payants_restants + v_pack.nb_tokens,
        updated_at = NOW();
END;
$$;

-- =============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_token_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_pack_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Plans & token_packs : lecture publique
DROP POLICY IF EXISTS "plans_select" ON public.plans;
CREATE POLICY "plans_select" ON public.plans
    FOR SELECT TO authenticated
    USING (actif = true OR public.is_admin());

DROP POLICY IF EXISTS "token_packs_select" ON public.token_packs;
CREATE POLICY "token_packs_select" ON public.token_packs
    FOR SELECT TO authenticated
    USING (actif = true OR public.is_admin());

-- Subscriptions : propriétaire ou admin
DROP POLICY IF EXISTS "sub_owner_select" ON public.subscriptions;
CREATE POLICY "sub_owner_select" ON public.subscriptions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- Usage_counters
DROP POLICY IF EXISTS "usage_owner_select" ON public.usage_counters;
CREATE POLICY "usage_owner_select" ON public.usage_counters
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- Wallets
DROP POLICY IF EXISTS "wallet_owner_select" ON public.ai_token_wallets;
CREATE POLICY "wallet_owner_select" ON public.ai_token_wallets
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- AI logs
DROP POLICY IF EXISTS "ai_logs_owner_select" ON public.ai_usage_logs;
CREATE POLICY "ai_logs_owner_select" ON public.ai_usage_logs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- Pack purchases
DROP POLICY IF EXISTS "purchases_owner_select" ON public.token_pack_purchases;
CREATE POLICY "purchases_owner_select" ON public.token_pack_purchases
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- Payments
DROP POLICY IF EXISTS "payments_owner_select" ON public.payments;
CREATE POLICY "payments_owner_select" ON public.payments
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "payments_owner_insert" ON public.payments;
CREATE POLICY "payments_owner_insert" ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 8. SEED : PALIERS PRIX PSYCHOLOGIQUES & PACKS DE TOKENS
-- =============================================================================

INSERT INTO public.plans (nom, prix_mensuel_fcfa, prix_annuel_fcfa, limites, actif)
VALUES
(
    'Solo',
    1490,
    14300,
    '{
        "max_exploitations": 1,
        "max_parcelles": 3,
        "historique_meteo_jours": 7,
        "projection_jours": 0,
        "fenetres_pulverisation_mois": 5,
        "max_users": 1,
        "alertes_sms_mois": 10,
        "tokens_ia_mois": 8000
    }'::jsonb,
    true
),
(
    'Pro Producteur',
    5900,
    56700,
    '{
        "max_exploitations": 1,
        "max_parcelles": 10,
        "historique_meteo_jours": 30,
        "projection_jours": 14,
        "fenetres_pulverisation_mois": 28,
        "max_users": 2,
        "alertes_sms_mois": 50,
        "tokens_ia_mois": 60000
    }'::jsonb,
    true
),
(
    'Coopérative & GIE',
    49900,
    479000,
    '{
        "max_exploitations": 15,
        "max_parcelles": 100,
        "historique_meteo_jours": 90,
        "projection_jours": 21,
        "fenetres_pulverisation_mois": 60,
        "max_users": 15,
        "alertes_sms_mois": 200,
        "tokens_ia_mois": 300000
    }'::jsonb,
    true
)
ON CONFLICT (nom) DO UPDATE
SET prix_mensuel_fcfa = EXCLUDED.prix_mensuel_fcfa,
    prix_annuel_fcfa = EXCLUDED.prix_annuel_fcfa,
    limites = EXCLUDED.limites,
    actif = EXCLUDED.actif;

-- Nettoyage des anciens noms de packs
DELETE FROM public.token_packs
WHERE nom IN (
    'Pack Découverte IA (50k tokens)',
    'Pack Saison IA (250k tokens)',
    'Pack Moisson IA (1M tokens)'
);

-- Packs de tokens (prix psychologiques, volumes cohérents)
INSERT INTO public.token_packs (nom, prix_fcfa, nb_tokens, actif)
VALUES
('Pack Éclair', 490, 5000, true),
('Pack Récolte', 1990, 25000, true),
('Pack Saison', 4900, 75000, true)
ON CONFLICT (nom) DO UPDATE
SET prix_fcfa = EXCLUDED.prix_fcfa,
    nb_tokens = EXCLUDED.nb_tokens,
    actif = EXCLUDED.actif;
