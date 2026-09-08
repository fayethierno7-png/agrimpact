-- ==========================================================
-- AGRIMPACT : Migration Console Admin, Finances & Événements
-- ==========================================================

-- 1. Mettre à jour la table profiles avec le rôle et le statut
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'producteur' CHECK (role IN ('producteur', 'admin')),
    ADD COLUMN IF NOT EXISTS statut_compte TEXT NOT NULL DEFAULT 'actif' CHECK (statut_compte IN ('actif', 'suspendu', 'en_attente'));

-- 2. Table: subscriptions (Abonnements exploitants)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'business')),
    statut TEXT NOT NULL CHECK (statut IN ('active', 'annule', 'expire')),
    montant NUMERIC(12, 2) NOT NULL DEFAULT 0,
    devise TEXT NOT NULL DEFAULT 'XOF',
    date_debut TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_fin TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table: payments (Paiements et remboursements)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    montant NUMERIC(12, 2) NOT NULL,
    statut TEXT NOT NULL CHECK (statut IN ('reussi', 'echoue', 'rembourse')),
    methode TEXT NOT NULL CHECK (methode IN ('wave', 'orange_money', 'carte', 'autre')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    remboursement_montant NUMERIC(12, 2),
    remboursement_date TIMESTAMPTZ
);

-- 4. Table: audit_log (Traçabilité des actions admin)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_nom TEXT,
    action TEXT NOT NULL, -- 'valider_utilisateur', 'suspendre_utilisateur', 'rembourser_paiement', etc.
    cible_type TEXT NOT NULL, -- 'user', 'payment', 'report', 'subscription'
    cible_id TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table: events (Funnel de conversion)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type_event TEXT NOT NULL CHECK (type_event IN ('inscription', 'exploitation_creee', 'premier_conseil_vu', 'abonnement_souscrit')),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Index de performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id, statut);
CREATE INDEX IF NOT EXISTS idx_payments_sub ON public.payments(subscription_id, statut);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_events_user_type ON public.events(user_id, type_event);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at);

-- 7. Politiques de Sécurité (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Subscriptions: l'utilisateur voit les siennes, l'admin voit tout
DROP POLICY IF EXISTS "Subscriptions User Read" ON public.subscriptions;
CREATE POLICY "Subscriptions User Read" ON public.subscriptions FOR SELECT
TO authenticated USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Subscriptions Admin All" ON public.subscriptions;
CREATE POLICY "Subscriptions Admin All" ON public.subscriptions FOR ALL
TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Payments: l'utilisateur voit les siens, l'admin a tous les droits
DROP POLICY IF EXISTS "Payments User Read" ON public.payments;
CREATE POLICY "Payments User Read" ON public.payments FOR SELECT
TO authenticated USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Payments Admin All" ON public.payments;
CREATE POLICY "Payments Admin All" ON public.payments FOR ALL
TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Audit Log: seul l'admin peut lire et écrire
DROP POLICY IF EXISTS "Audit Log Admin Read" ON public.audit_log;
CREATE POLICY "Audit Log Admin Read" ON public.audit_log FOR SELECT
TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Audit Log Admin Insert" ON public.audit_log;
CREATE POLICY "Audit Log Admin Insert" ON public.audit_log FOR INSERT
TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Events: tout utilisateur authentifié peut enregistrer ses événements, l'admin voit tout
DROP POLICY IF EXISTS "Events User Insert" ON public.events;
CREATE POLICY "Events User Insert" ON public.events FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Events Admin Read" ON public.events;
CREATE POLICY "Events Admin Read" ON public.events FOR SELECT
TO authenticated USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
