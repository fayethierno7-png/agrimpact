-- ==============================================================================
-- MIGRATION : CONSOLE ADMIN RÉELLEMENT FONCTIONNELLE
--
-- Constats en base de production (xtizlewxnrttymtydqka) :
-- 1. La table `app_settings` (paramètres de contact) N'EXISTE PAS DU TOUT —
--    la sauvegarde des coordonnées de contact ne pouvait donc jamais
--    fonctionner, quel que soit le code applicatif.
-- 2. Aucune policy RLS n'autorise un admin à modifier `reports` (seules des
--    policies INSERT/SELECT pour le producteur propriétaire existent) — le
--    traitement d'un signalement échoue systématiquement hors clé service_role.
-- 3. Les policies admin existantes sur audit_log/payments/subscriptions ne
--    vérifient que `role = 'admin'`, jamais `'superadmin'` — le compte
--    propriétaire (superadmin) serait rejeté sur ces tables hors service_role.
-- ==============================================================================

-- 1. TABLE app_settings (paramètres globaux, dont les coordonnées de contact)
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY,
    support_phone TEXT,
    support_phone_visible BOOLEAN NOT NULL DEFAULT true,
    contact_email TEXT,
    contact_email_visible BOOLEAN NOT NULL DEFAULT true,
    whatsapp_link TEXT,
    whatsapp_visible BOOLEAN NOT NULL DEFAULT true,
    social_link TEXT,
    social_visible BOOLEAN NOT NULL DEFAULT true,
    global_visible BOOLEAN NOT NULL DEFAULT true,
    updated_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App Settings Public Read" ON public.app_settings;
CREATE POLICY "App Settings Public Read" ON public.app_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "App Settings Admin Write" ON public.app_settings;
CREATE POLICY "App Settings Admin Write" ON public.app_settings
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin')));

-- 2. REPORTS : policy manquante pour que l'admin puisse traiter un signalement
DROP POLICY IF EXISTS "Reports Admin All" ON public.reports;
CREATE POLICY "Reports Admin All" ON public.reports
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin')));

-- 3. AUDIT_LOG / PAYMENTS / SUBSCRIPTIONS : accepter aussi 'superadmin'
DROP POLICY IF EXISTS "Audit Log Admin Insert" ON public.audit_log;
CREATE POLICY "Audit Log Admin Insert" ON public.audit_log
    FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin')));

DROP POLICY IF EXISTS "Audit Log Admin Read" ON public.audit_log;
CREATE POLICY "Audit Log Admin Read" ON public.audit_log
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin')));

DROP POLICY IF EXISTS "Payments Admin All" ON public.payments;
CREATE POLICY "Payments Admin All" ON public.payments
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin')));

DROP POLICY IF EXISTS "Payments User Read" ON public.payments;
CREATE POLICY "Payments User Read" ON public.payments
    FOR SELECT
    USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin')));

DROP POLICY IF EXISTS "Subscriptions Admin All" ON public.subscriptions;
CREATE POLICY "Subscriptions Admin All" ON public.subscriptions
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin')));

DROP POLICY IF EXISTS "Subscriptions User Read" ON public.subscriptions;
CREATE POLICY "Subscriptions User Read" ON public.subscriptions
    FOR SELECT
    USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin')));
