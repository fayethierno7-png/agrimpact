-- ==============================================================================
-- SCRIPT COMPLET & 100% IDEMPOTENT POUR SUPABASE SQL EDITOR
-- Aucune erreur 42710 (policy exists) ni 42703 (column missing)
-- Peut être ré-exécuté autant de fois que nécessaire sans erreur
-- ==============================================================================

-- ============================================================
-- 0. GARANTIR QUE TOUTES LES COLONNES REQUISES EXISTENT
--    (résout l'erreur 42703 si la table a été créée sans elles)
-- ============================================================
DO $$
BEGIN
    -- Colonnes de la table profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='nom') THEN
        ALTER TABLE public.profiles ADD COLUMN nom TEXT DEFAULT '';
        RAISE NOTICE 'Colonne nom ajoutée à profiles';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id') THEN
        ALTER TABLE public.profiles ADD COLUMN user_id UUID;
        RAISE NOTICE 'Colonne user_id ajoutée à profiles';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='telephone_contact') THEN
        ALTER TABLE public.profiles ADD COLUMN telephone_contact TEXT;
        RAISE NOTICE 'Colonne telephone_contact ajoutée à profiles';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='plan') THEN
        ALTER TABLE public.profiles ADD COLUMN plan TEXT DEFAULT 'free';
        RAISE NOTICE 'Colonne plan ajoutée à profiles';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'producteur';
        RAISE NOTICE 'Colonne role ajoutée à profiles';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='statut_compte') THEN
        ALTER TABLE public.profiles ADD COLUMN statut_compte TEXT DEFAULT 'en_attente';
        RAISE NOTICE 'Colonne statut_compte ajoutée à profiles';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Colonne avatar_url ajoutée à profiles';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='theme') THEN
        ALTER TABLE public.profiles ADD COLUMN theme TEXT DEFAULT 'system';
        RAISE NOTICE 'Colonne theme ajoutée à profiles';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='created_at') THEN
        ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Colonne created_at ajoutée à profiles';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Colonne updated_at ajoutée à profiles';
    END IF;

    -- Contrainte UNIQUE sur user_id si manquante
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema='public' AND table_name='profiles'
          AND constraint_type='UNIQUE'
          AND constraint_name='unique_profile_user'
    ) THEN
        BEGIN
            ALTER TABLE public.profiles ADD CONSTRAINT unique_profile_user UNIQUE (user_id);
            RAISE NOTICE 'Contrainte unique_profile_user ajoutée à profiles';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'Contrainte unique_profile_user existe déjà (sous un autre nom)';
        END;
    END IF;
END $$;

-- ============================================================
-- 1. CRÉATION DE LA TABLE APP_SETTINGS SI MANQUANTE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY,
    support_phone TEXT DEFAULT '+221 33 800 12 12',
    support_phone_visible BOOLEAN DEFAULT true,
    contact_email TEXT DEFAULT 'contact@agrimpact.sn',
    contact_email_visible BOOLEAN DEFAULT true,
    whatsapp_link TEXT DEFAULT 'https://wa.me/221771234567',
    whatsapp_visible BOOLEAN DEFAULT true,
    social_link TEXT DEFAULT 'https://facebook.com/agrimpact',
    social_visible BOOLEAN DEFAULT true,
    global_visible BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

-- Insertion des réglages de contact par défaut si non existants
INSERT INTO public.app_settings (id, support_phone, contact_email, whatsapp_link, social_link)
VALUES ('contact_settings', '+221 33 800 12 12', 'contact@agrimpact.sn', 'https://wa.me/221771234567', 'https://facebook.com/agrimpact')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. POLICIES SUR APP_SETTINGS (DROP SYSTÉMATIQUE AVANT CREATE)
-- ============================================================
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_settings_public_select" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_admin_all" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_superadmin_modify" ON public.app_settings;

CREATE POLICY "app_settings_public_select" ON public.app_settings
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "app_settings_admin_all" ON public.app_settings
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- 3. POLICIES SUR PROFILES (DROP de TOUS les noms anciens + nouveaux)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Anciens noms
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_anon_signup" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
-- Nouveaux noms (au cas où le script a déjà tourné)
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_all" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- 4. POLICIES SUR FARMS
-- ============================================================
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farms Admin Read All" ON public.farms;
DROP POLICY IF EXISTS "Users can manage own farms" ON public.farms;
DROP POLICY IF EXISTS "farms_insert_policy" ON public.farms;
DROP POLICY IF EXISTS "farms_select_all" ON public.farms;
DROP POLICY IF EXISTS "farms_insert_all" ON public.farms;
DROP POLICY IF EXISTS "farms_update_all" ON public.farms;
CREATE POLICY "farms_select_all" ON public.farms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "farms_insert_all" ON public.farms FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "farms_update_all" ON public.farms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5. POLICIES SUR PLOTS
-- ============================================================
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plots_insert_policy" ON public.plots;
DROP POLICY IF EXISTS "Users can manage own plots" ON public.plots;
DROP POLICY IF EXISTS "plots_select_all" ON public.plots;
DROP POLICY IF EXISTS "plots_insert_all" ON public.plots;
CREATE POLICY "plots_select_all" ON public.plots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "plots_insert_all" ON public.plots FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- 6. POLICIES SUR PAYMENTS
-- ============================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Payments User Read" ON public.payments;
DROP POLICY IF EXISTS "Payments Admin All" ON public.payments;
DROP POLICY IF EXISTS "Payments SuperAdmin All" ON public.payments;
DROP POLICY IF EXISTS "payments_select_all" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_all" ON public.payments;
DROP POLICY IF EXISTS "payments_update_all" ON public.payments;
CREATE POLICY "payments_select_all" ON public.payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "payments_insert_all" ON public.payments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "payments_update_all" ON public.payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 7. POLICIES SUR SUBSCRIPTIONS
-- ============================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Subscriptions User Read" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions Admin All" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions SuperAdmin All" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_all" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_all" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_all" ON public.subscriptions;
CREATE POLICY "subscriptions_select_all" ON public.subscriptions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "subscriptions_insert_all" ON public.subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "subscriptions_update_all" ON public.subscriptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 8. POLICIES SUR AUDIT_LOG
-- ============================================================
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit Log Admin Read" ON public.audit_log;
DROP POLICY IF EXISTS "Audit Log Admin Insert" ON public.audit_log;
DROP POLICY IF EXISTS "Audit Log SuperAdmin Read" ON public.audit_log;
DROP POLICY IF EXISTS "Audit Log SuperAdmin Insert" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_select_all" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_insert_all" ON public.audit_log;
CREATE POLICY "audit_log_select_all" ON public.audit_log FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "audit_log_insert_all" ON public.audit_log FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- 9. POLICIES SUR REPORTS
-- ============================================================
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reports User Select" ON public.reports;
DROP POLICY IF EXISTS "Reports User Insert" ON public.reports;
DROP POLICY IF EXISTS "Reports Admin Update" ON public.reports;
DROP POLICY IF EXISTS "Reports SuperAdmin Update" ON public.reports;
DROP POLICY IF EXISTS "reports_select_all" ON public.reports;
DROP POLICY IF EXISTS "reports_insert_all" ON public.reports;
DROP POLICY IF EXISTS "reports_update_all" ON public.reports;
CREATE POLICY "reports_select_all" ON public.reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reports_insert_all" ON public.reports FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "reports_update_all" ON public.reports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 10. POLICIES SUR EVENTS
-- ============================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Events User Insert" ON public.events;
DROP POLICY IF EXISTS "Events Admin Read" ON public.events;
DROP POLICY IF EXISTS "Events SuperAdmin Read" ON public.events;
DROP POLICY IF EXISTS "events_select_all" ON public.events;
DROP POLICY IF EXISTS "events_insert_all" ON public.events;
CREATE POLICY "events_select_all" ON public.events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "events_insert_all" ON public.events FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- 11. TRIGGER AUTOMATIQUE À L'INSCRIPTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        user_id,
        nom,
        telephone_contact,
        plan,
        role,
        statut_compte,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nom', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'telephone', ''),
        'free',
        CASE WHEN LOWER(COALESCE(NEW.email, '')) = 'fayethierno7@gmail.com' THEN 'superadmin' ELSE 'producteur' END,
        CASE WHEN LOWER(COALESCE(NEW.email, '')) = 'fayethierno7@gmail.com' THEN 'actif' ELSE 'en_attente' END,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 12. RATTRAPAGE DES COMPTES AUTH.USERS EXISTANTS DANS PROFILES
-- ============================================================
INSERT INTO public.profiles (
    id,
    user_id,
    nom,
    telephone_contact,
    plan,
    role,
    statut_compte,
    created_at,
    updated_at
)
SELECT 
    u.id,
    u.id,
    COALESCE(u.raw_user_meta_data->>'nom', split_part(u.email, '@', 1)),
    COALESCE(u.raw_user_meta_data->>'telephone', ''),
    'free',
    CASE WHEN LOWER(u.email) = 'fayethierno7@gmail.com' THEN 'superadmin' ELSE 'producteur' END,
    CASE WHEN LOWER(u.email) = 'fayethierno7@gmail.com' THEN 'actif' ELSE 'en_attente' END,
    u.created_at,
    NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL
ON CONFLICT (user_id) DO NOTHING;
