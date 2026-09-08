-- ==========================================================
-- AGRIMPACT : Migration Table Reports (Signalements Producteurs)
-- ==========================================================

-- 1. Types ENUM pour les types et statuts de signalement
DO $$ BEGIN
    CREATE TYPE public.report_type AS ENUM (
        'recommandation_incorrecte',
        'bug_technique',
        'donnee_meteo_incorrecte',
        'autre'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.report_status AS ENUM (
        'nouveau',
        'en_cours',
        'resolu'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Création de la table reports
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type public.report_type NOT NULL,
    description TEXT NOT NULL CHECK (length(trim(description)) >= 10),
    statut public.report_status NOT NULL DEFAULT 'nouveau',
    admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Index pour accélérer les requêtes par utilisateur et statut
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_statut ON public.reports(statut);

-- 3. Activation de la sécurité RLS (Row Level Security)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 4. Politiques de sécurité RLS
-- Les producteurs ne voient que leurs propres signalements
DROP POLICY IF EXISTS "Reports User Select" ON public.reports;
CREATE POLICY "Reports User Select"
ON public.reports FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Les producteurs peuvent insérer des signalements associés à leur compte
DROP POLICY IF EXISTS "Reports User Insert" ON public.reports;
CREATE POLICY "Reports User Insert"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
