-- ==============================================================================
-- MIGRATION : EXPIRATION RÉELLE DES ABONNEMENTS PAYANTS
--
-- Jusqu'ici, rien ne faisait jamais expirer un abonnement payant : une fois
-- `profiles.plan` mis à 'pro'/'solo'/etc. par le webhook de paiement, l'accès
-- restait actif indéfiniment, même sans renouvellement (voir `middleware.ts`,
-- le blocage par délai de grâce reposait sur des colonnes qui n'existaient pas
-- en base). Cette migration ajoute une date d'expiration réelle, vérifiée à
-- chaque requête, sur le même principe que `essai_expire_le` (essai gratuit).
--
-- `abonnement_expire_le` est fixée par le webhook de paiement (clé service_role)
-- à chaque paiement confirmé (now + 30 jours), et verrouillée contre toute
-- écriture cliente par le trigger anti-fraude existant.
-- ==============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS abonnement_expire_le TIMESTAMPTZ;

-- Étend le trigger anti-fraude existant (protect_privileged_profile_columns)
-- pour verrouiller aussi cette nouvelle colonne.
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.plan := 'free';
    NEW.role := 'producteur';
    NEW.statut_compte := 'actif';
    NEW.essai_expire_le := COALESCE(NEW.essai_expire_le, NOW() + INTERVAL '7 days');
    NEW.abonnement_expire_le := NULL;
    RETURN NEW;
  END IF;

  NEW.plan := OLD.plan;
  NEW.role := OLD.role;
  NEW.statut_compte := OLD.statut_compte;
  NEW.essai_expire_le := OLD.essai_expire_le;
  NEW.abonnement_expire_le := OLD.abonnement_expire_le;
  RETURN NEW;
END;
$$;
