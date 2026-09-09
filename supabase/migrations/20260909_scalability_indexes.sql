-- ==============================================================================
-- MIGRATION SCALABILITÉ & PERFORMANCE (AgriImpact SaaS)
-- 
-- Objectif : Optimiser les requêtes fréquentes (WHERE, JOIN, ORDER BY) pour
-- supporter le passage à l'échelle (1 000 à 1 000 000 d'utilisateurs) sans
-- Full Table Scans sur Postgres.
-- ==============================================================================

-- 1. Index critique sur les souscriptions / webhooks (utilisé à chaque polling et webhook de paiement)
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_id 
  ON public.subscriptions(provider_subscription_id);

-- 2. Index sur les profils pour le tableau de bord administrateur et le RBAC
CREATE INDEX IF NOT EXISTS idx_profiles_role 
  ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_created_at 
  ON public.profiles(created_at DESC);

-- 3. Index géographiques et agronomiques pour les requêtes agrégées régionales
CREATE INDEX IF NOT EXISTS idx_farms_region 
  ON public.farms(region);

CREATE INDEX IF NOT EXISTS idx_plots_culture 
  ON public.plots(culture);

-- 4. Index sur les journaux d'audit pour les filtres par cible
CREATE INDEX IF NOT EXISTS idx_audit_log_cible 
  ON public.audit_log(cible_type, cible_id);
