-- =============================================================================
-- AGRIMPACT : MIGRATION COMPLÉMENTAIRE
-- 1. Table des paramètres de contact administrables (Point 14)
-- 2. Table des conversations IA partagées avec token sécurisé (Point 8)
-- 3. Statut par défaut 'en_attente' pour les nouveaux comptes (Point 13)
-- =============================================================================

-- 1. Table des paramètres de contact (app_settings)
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'contact_settings',
    support_phone TEXT NOT NULL DEFAULT '33 800 12 12',
    support_phone_visible BOOLEAN NOT NULL DEFAULT true,
    contact_email TEXT NOT NULL DEFAULT 'contact@agrimpact.sn',
    contact_email_visible BOOLEAN NOT NULL DEFAULT true,
    whatsapp_link TEXT NOT NULL DEFAULT 'https://wa.me/221771234567',
    whatsapp_visible BOOLEAN NOT NULL DEFAULT true,
    social_link TEXT NOT NULL DEFAULT 'https://facebook.com/agrimpact',
    social_visible BOOLEAN NOT NULL DEFAULT true,
    global_visible BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Insertion de la ligne par défaut si inexistante
INSERT INTO public.app_settings (id, support_phone, contact_email, whatsapp_link, social_link)
VALUES ('contact_settings', '33 800 12 12', 'contact@agrimpact.sn', 'https://wa.me/221771234567', 'https://facebook.com/agrimpact')
ON CONFLICT (id) DO NOTHING;

-- RLS sur app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "app_settings_public_select" ON public.app_settings';
    EXECUTE 'CREATE POLICY "app_settings_public_select" ON public.app_settings FOR SELECT USING (true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "app_settings_admin_all" ON public.app_settings';
    EXECUTE 'CREATE POLICY "app_settings_admin_all" ON public.app_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. Table des conversations partagées (shared_conversations)
CREATE TABLE IF NOT EXISTS public.shared_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_token TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_nom TEXT NOT NULL DEFAULT 'Producteur',
    title TEXT NOT NULL,
    messages JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_conv_token ON public.shared_conversations(share_token);

-- RLS : seuls les utilisateurs authentifiés du SaaS peuvent lire les discussions partagées
ALTER TABLE public.shared_conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "shared_conv_auth_select" ON public.shared_conversations';
    EXECUTE 'CREATE POLICY "shared_conv_auth_select" ON public.shared_conversations FOR SELECT TO authenticated USING (true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "shared_conv_owner_insert" ON public.shared_conversations';
    EXECUTE 'CREATE POLICY "shared_conv_owner_insert" ON public.shared_conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 3. Sécurisation de statut_compte 'en_attente' par défaut sur profiles
DO $$ BEGIN
    ALTER TABLE public.profiles ALTER COLUMN statut_compte SET DEFAULT 'en_attente';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
