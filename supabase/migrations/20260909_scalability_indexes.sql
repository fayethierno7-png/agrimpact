-- ==============================================================================
-- MIGRATION SCALABILITÉ & PERFORMANCE (AgriImpact SaaS)
-- 
-- Objectif : Optimiser les requêtes fréquentes (WHERE, JOIN, ORDER BY) pour
-- supporter le passage à l'échelle (1 000 à 1 000 000 d'utilisateurs) sans
-- Full Table Scans sur Postgres.
--
-- NOTE : Chaque index est conditionné à l'existence de la table/colonne cible
-- pour éviter les erreurs si certaines migrations n'ont pas encore été exécutées.
-- ==============================================================================

DO $$
BEGIN

    -- =========================================================================
    -- 1. subscriptions : ajouter provider_subscription_id si manquante + index
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscriptions') THEN
        -- Ajouter la colonne si elle n'existe pas
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'subscriptions'
              AND column_name = 'provider_subscription_id'
        ) THEN
            ALTER TABLE public.subscriptions ADD COLUMN provider_subscription_id TEXT;
            RAISE NOTICE 'Colonne provider_subscription_id ajoutée à subscriptions';
        END IF;

        -- Index sur provider_subscription_id
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subscriptions_provider_id') THEN
            CREATE INDEX idx_subscriptions_provider_id ON public.subscriptions(provider_subscription_id);
        END IF;
    ELSE
        RAISE NOTICE 'Table subscriptions inexistante — index ignoré';
    END IF;

    -- =========================================================================
    -- 2. profiles : indexes pour le dashboard admin et le RBAC
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_role') THEN
            CREATE INDEX idx_profiles_role ON public.profiles(role);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_created_at') THEN
            CREATE INDEX idx_profiles_created_at ON public.profiles(created_at DESC);
        END IF;
    ELSE
        RAISE NOTICE 'Table profiles inexistante — index ignorés';
    END IF;

    -- =========================================================================
    -- 3. farms & plots : indexes géographiques et agronomiques
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='farms') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_farms_region') THEN
            CREATE INDEX idx_farms_region ON public.farms(region);
        END IF;
    ELSE
        RAISE NOTICE 'Table farms inexistante — index ignoré';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='plots') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_plots_culture') THEN
            CREATE INDEX idx_plots_culture ON public.plots(culture);
        END IF;
    ELSE
        RAISE NOTICE 'Table plots inexistante — index ignoré';
    END IF;

    -- =========================================================================
    -- 4. audit_log : index sur cible_type + cible_id
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_log') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_log_cible') THEN
            CREATE INDEX idx_audit_log_cible ON public.audit_log(cible_type, cible_id);
        END IF;
    ELSE
        RAISE NOTICE 'Table audit_log inexistante — index ignoré';
    END IF;

END $$;
