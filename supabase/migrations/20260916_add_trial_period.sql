-- ==============================================================================
-- MIGRATION : ESSAI GRATUIT DE 7 JOURS AVANT PAYWALL
-- Un nouveau compte (plan 'free') garde un accès complet pendant 7 jours après
-- l'inscription, au lieu d'être immédiatement redirigé vers /tarifs. Le paywall
-- strict ne s'applique qu'une fois l'essai expiré.
-- ==============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS essai_expire_le TIMESTAMPTZ;
