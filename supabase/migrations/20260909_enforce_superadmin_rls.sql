-- ==============================================================================
-- MIGRATION SÉCURITÉ CONSOLE ADMIN AGRIMPACT : SUPERADMIN EXCLUSIF
-- Compte exclusif : fayethierno7@gmail.com
-- ==============================================================================

-- ============================================================
-- ÉTAPE 0 : CONVERSION ENUM → TEXT (résolution erreur 22P02)
-- La colonne role utilise actuellement un type ENUM 'user_role'
-- qui ne contient pas 'producteur'. On convertit en TEXT pur.
-- ============================================================

-- 0.1 Supprimer toute contrainte CHECK existante sur la colonne role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 0.2 Supprimer le DEFAULT actuel (qui référence potentiellement l'ENUM)
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- 0.3 Convertir la colonne de ENUM vers TEXT
-- USING role::text force la conversion explicite
ALTER TABLE public.profiles ALTER COLUMN role TYPE TEXT USING role::text;

-- 0.4 Remettre le DEFAULT en TEXT
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'producteur';

-- 0.5 Supprimer le type ENUM désormais inutile (s'il existe)
DROP TYPE IF EXISTS user_role CASCADE;

-- ============================================================
-- ÉTAPE 1 : NORMALISATION DES VALEURS EXISTANTES
-- Mapper les anciennes valeurs ENUM vers les nouvelles
-- ============================================================

-- Si l'ancien ENUM utilisait 'user' au lieu de 'producteur', on normalise
UPDATE public.profiles SET role = 'producteur' WHERE role = 'user';
UPDATE public.profiles SET role = 'producteur' WHERE role IS NULL OR role = '';

-- ============================================================
-- ÉTAPE 2 : CONTRAINTE CHECK TEXT STRICTE
-- ============================================================

ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('producteur', 'admin', 'superadmin'));

-- ============================================================
-- ÉTAPE 3 : ASSIGNATION EXCLUSIVE DU RÔLE SUPERADMIN
-- ============================================================

-- Assigner superadmin UNIQUEMENT au compte propriétaire
UPDATE public.profiles
SET role = 'superadmin'
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE LOWER(email) = 'fayethierno7@gmail.com'
);

-- Rétrograder TOUT autre compte ayant indûment 'admin' ou 'superadmin'
UPDATE public.profiles
SET role = 'producteur'
WHERE role IN ('admin', 'superadmin')
  AND user_id NOT IN (
    SELECT id FROM auth.users 
    WHERE LOWER(email) = 'fayethierno7@gmail.com'
  );

-- Synchroniser les métadonnées JWT auth.users pour le superadmin
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "superadmin"}'::jsonb,
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "superadmin"}'::jsonb
WHERE LOWER(email) = 'fayethierno7@gmail.com';

-- Nettoyer les métadonnées role des autres comptes
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'role',
    raw_user_meta_data = raw_user_meta_data - 'role'
WHERE LOWER(email) <> 'fayethierno7@gmail.com'
  AND (
    raw_app_meta_data->>'role' IN ('admin', 'superadmin') 
    OR raw_user_meta_data->>'role' IN ('admin', 'superadmin')
  );

-- ============================================================
-- ÉTAPE 4 : FONCTIONS HELPER SECURITY DEFINER
-- ============================================================

-- is_superadmin() : vérifie que l'utilisateur authentifié a le rôle superadmin en base
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() AND role = 'superadmin'
    );
END;
$$;

-- is_admin() : redirige vers is_superadmin() pour compatibilité avec les anciennes policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.is_superadmin();
END;
$$;

-- ============================================================
-- ÉTAPE 5 : TRIGGER ANTI-USURPATION DU RÔLE
-- Empêche tout utilisateur non-superadmin de modifier le champ 'role'
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_role_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF NOT public.is_superadmin() THEN
            RAISE EXCEPTION 'Interdiction formelle de modifier le rôle utilisateur.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_tampering ON public.profiles;
CREATE TRIGGER trg_prevent_role_tampering
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_tampering();

-- ============================================================
-- ÉTAPE 6 : POLITIQUES RLS SUR LES TABLES SENSIBLES
-- ============================================================

-- 6.1 PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_superadmin());

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id OR public.is_superadmin())
    WITH CHECK (auth.uid() = user_id OR public.is_superadmin());

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 6.2 AUDIT_LOG : création si absente + RLS superadmin strict
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_nom TEXT,
    action TEXT NOT NULL,
    cible_type TEXT NOT NULL,
    cible_id TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS admin_id UUID;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS admin_nom TEXT;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS cible_type TEXT;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS cible_id TEXT;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit Log Admin Read" ON public.audit_log;
DROP POLICY IF EXISTS "Audit Log Admin Insert" ON public.audit_log;
DROP POLICY IF EXISTS "Audit Log SuperAdmin Read" ON public.audit_log;
DROP POLICY IF EXISTS "Audit Log SuperAdmin Insert" ON public.audit_log;

CREATE POLICY "Audit Log SuperAdmin Read" ON public.audit_log
    FOR SELECT TO authenticated
    USING (public.is_superadmin());

CREATE POLICY "Audit Log SuperAdmin Insert" ON public.audit_log
    FOR INSERT TO authenticated
    WITH CHECK (public.is_superadmin());

-- 6.3 REPORTS : création si absente + RLS
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'bug',
    titre TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    statut TEXT NOT NULL DEFAULT 'en_attente',
    priority TEXT DEFAULT 'normale',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reports User Select" ON public.reports;
DROP POLICY IF EXISTS "Reports User Insert" ON public.reports;
DROP POLICY IF EXISTS "Reports SuperAdmin All" ON public.reports;
DROP POLICY IF EXISTS "Reports SuperAdmin Update" ON public.reports;

CREATE POLICY "Reports User Select" ON public.reports
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_superadmin());

CREATE POLICY "Reports User Insert" ON public.reports
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Reports SuperAdmin Update" ON public.reports
    FOR UPDATE TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());

-- 6.4 SUBSCRIPTIONS : création si absente + RLS
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free',
    statut TEXT NOT NULL DEFAULT 'active',
    montant NUMERIC(12, 2) NOT NULL DEFAULT 0,
    devise TEXT NOT NULL DEFAULT 'XOF',
    date_debut TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_fin TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'active';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id, statut);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sub_owner_select" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions User Read" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions Admin All" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions SuperAdmin All" ON public.subscriptions;

CREATE POLICY "Subscriptions SuperAdmin All" ON public.subscriptions
    FOR ALL TO authenticated
    USING (auth.uid() = user_id OR public.is_superadmin())
    WITH CHECK (auth.uid() = user_id OR public.is_superadmin());

-- 6.5 PAYMENTS : création si absente + RLS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    montant NUMERIC(12, 2) NOT NULL DEFAULT 0,
    statut TEXT NOT NULL DEFAULT 'reussi',
    methode TEXT NOT NULL DEFAULT 'wave',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    remboursement_montant NUMERIC(12, 2),
    remboursement_date TIMESTAMPTZ
);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_owner_select" ON public.payments;
DROP POLICY IF EXISTS "payments_owner_insert" ON public.payments;
DROP POLICY IF EXISTS "Payments User Read" ON public.payments;
DROP POLICY IF EXISTS "Payments Admin All" ON public.payments;
DROP POLICY IF EXISTS "Payments SuperAdmin All" ON public.payments;

CREATE POLICY "Payments SuperAdmin All" ON public.payments
    FOR ALL TO authenticated
    USING (auth.uid() = user_id OR public.is_superadmin())
    WITH CHECK (auth.uid() = user_id OR public.is_superadmin());

-- 6.6 EVENTS : création si absente + RLS
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type_event TEXT NOT NULL DEFAULT 'inscription',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS type_event TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_events_user_type ON public.events(user_id, type_event);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Events Admin Read" ON public.events;
DROP POLICY IF EXISTS "Events User Insert" ON public.events;
DROP POLICY IF EXISTS "Events SuperAdmin Read" ON public.events;

CREATE POLICY "Events User Insert" ON public.events
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR public.is_superadmin());

CREATE POLICY "Events SuperAdmin Read" ON public.events
    FOR SELECT TO authenticated
    USING (public.is_superadmin());

-- 6.7 APP_SETTINGS : création si absente + lecture publique, écriture superadmin
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY,
    support_phone TEXT,
    support_phone_visible BOOLEAN DEFAULT true,
    contact_email TEXT,
    contact_email_visible BOOLEAN DEFAULT true,
    whatsapp_link TEXT,
    whatsapp_visible BOOLEAN DEFAULT true,
    social_link TEXT,
    social_visible BOOLEAN DEFAULT true,
    global_visible BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_settings_public_select" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_admin_all" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_superadmin_modify" ON public.app_settings;

CREATE POLICY "app_settings_public_select" ON public.app_settings
    FOR SELECT USING (true);

CREATE POLICY "app_settings_superadmin_modify" ON public.app_settings
    FOR ALL TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());

-- ============================================================
-- MIGRATION TERMINÉE
-- Pour vérifier le résultat, exécutez séparément :
-- SELECT p.user_id, p.role, u.email, pg_typeof(p.role)
-- FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.user_id
-- WHERE p.role IN ('admin','superadmin') OR u.email ILIKE '%fayethierno%';
-- ============================================================
