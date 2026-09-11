-- ==============================================================================
-- MIGRATION SÉCURITÉ CONSOLE ADMIN AGRIMPACT : RLS ADMIN & SUPERADMIN COMPLET
-- Corrige le blocage RLS silencieux et autorise les rôles 'admin' et 'superadmin'
-- ==============================================================================

-- 1. FONCTIONS HELPER RBAC RÉSISTANTES & ROBUSTES
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'fayethierno7@gmail.com'
        OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'superadmin'
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid() AND role = 'superadmin'
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        public.is_superadmin()
        OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'superadmin')
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid() AND (role IN ('admin', 'superadmin') OR is_admin = true)
        )
    );
END;
$$;

-- 2. POLICIES SUR LA TABLE PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id 
        OR LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'fayethierno7@gmail.com'
        OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'superadmin')
        OR public.is_admin()
    );

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = user_id 
        OR LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'fayethierno7@gmail.com'
        OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'superadmin')
        OR public.is_admin()
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'fayethierno7@gmail.com'
        OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'superadmin')
        OR public.is_admin()
    );

-- 3. POLICIES SUR LA TABLE FARMS (Permet à la console admin de lier les exploitations)
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farms Admin Read All" ON public.farms;
CREATE POLICY "Farms Admin Read All" ON public.farms
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- 4. POLICIES SUR LA TABLE AUDIT_LOG
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit Log SuperAdmin Read" ON public.audit_log;
DROP POLICY IF EXISTS "Audit Log SuperAdmin Insert" ON public.audit_log;
DROP POLICY IF EXISTS "Audit Log Admin Read" ON public.audit_log;
DROP POLICY IF EXISTS "Audit Log Admin Insert" ON public.audit_log;

CREATE POLICY "Audit Log Admin Read" ON public.audit_log
    FOR SELECT TO authenticated
    USING (public.is_admin());

CREATE POLICY "Audit Log Admin Insert" ON public.audit_log
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

-- 5. POLICIES SUR LA TABLE REPORTS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reports User Select" ON public.reports;
DROP POLICY IF EXISTS "Reports SuperAdmin Update" ON public.reports;
DROP POLICY IF EXISTS "Reports Admin Update" ON public.reports;

CREATE POLICY "Reports User Select" ON public.reports
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Reports Admin Update" ON public.reports
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 6. POLICIES SUR LA TABLE SUBSCRIPTIONS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Subscriptions SuperAdmin All" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions Admin All" ON public.subscriptions;

CREATE POLICY "Subscriptions Admin All" ON public.subscriptions
    FOR ALL TO authenticated
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 7. POLICIES SUR LA TABLE PAYMENTS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Payments SuperAdmin All" ON public.payments;
DROP POLICY IF EXISTS "Payments Admin All" ON public.payments;

CREATE POLICY "Payments Admin All" ON public.payments
    FOR ALL TO authenticated
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 8. POLICIES SUR LA TABLE EVENTS (Funnel de conversion)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Events SuperAdmin Read" ON public.events;
DROP POLICY IF EXISTS "Events Admin Read" ON public.events;

CREATE POLICY "Events Admin Read" ON public.events
    FOR SELECT TO authenticated
    USING (public.is_admin());

-- 9. POLICIES SUR LA TABLE APP_SETTINGS (Coordonnées contact)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_settings_superadmin_modify" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_admin_modify" ON public.app_settings;

CREATE POLICY "app_settings_admin_modify" ON public.app_settings
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
