-- ==============================================================================
-- MIGRATION : SÉCURISATION DES ÉCRITURES SUR profiles (ANTI-FRAUDE PAIEMENT)
--
-- Problème corrigé : la policy RLS "Users can manage own profile" (ALL, USING
-- auth.uid() = user_id) permet à n'importe quel utilisateur connecté de modifier
-- directement plan/role/statut_compte/essai_expire_le de son propre profil via
-- le client Supabase (ex: supabase.from('profiles').update({ plan: 'cooperative' })
-- depuis la console du navigateur), sans jamais payer. Le code applicatif
-- (updatePlan(), PaymentModal, /payment/success) s'appuyait sur cette écriture
-- client pour "activer" un forfait après paiement — donc n'importe qui pouvait
-- s'octroyer un forfait payant gratuitement.
--
-- Corrigé par un trigger qui verrouille plan/role/statut_compte/essai_expire_le :
-- seules les requêtes exécutées avec la clé service_role (routes serveur :
-- webhook de paiement, register-profile, API admin) peuvent modifier ces colonnes.
-- Toute tentative d'écriture cliente sur ces colonnes est silencieusement ignorée
-- (la valeur existante est conservée).
--
-- Corrige aussi au passage les contraintes CHECK obsolètes sur plan/role qui
-- rejetaient déjà silencieusement 'solo', 'cooperative' et 'superadmin' — des
-- valeurs utilisées partout dans le code applicatif.
-- ==============================================================================

-- 1. Contraintes CHECK à jour avec les valeurs réellement utilisées par l'app
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'solo', 'pro', 'business', 'cooperative'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('producteur', 'admin', 'superadmin'));

-- 2. Verrou anti-fraude : seul service_role peut changer les colonnes privilégiées
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Les routes serveur (webhook paiement, register-profile, API admin) utilisent
  -- la clé service_role et peuvent modifier librement ces colonnes.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Un profil créé côté client démarre toujours avec des valeurs sûres,
    -- quoi que le payload d'insertion contienne.
    NEW.plan := 'free';
    NEW.role := 'producteur';
    NEW.statut_compte := 'actif';
    NEW.essai_expire_le := COALESCE(NEW.essai_expire_le, NOW() + INTERVAL '7 days');
    RETURN NEW;
  END IF;

  -- UPDATE : un client authentifié ne peut jamais changer ces colonnes lui-même,
  -- quelle que soit la valeur qu'il tente d'envoyer.
  NEW.plan := OLD.plan;
  NEW.role := OLD.role;
  NEW.statut_compte := OLD.statut_compte;
  NEW.essai_expire_le := OLD.essai_expire_le;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_privileged_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_privileged_profile_columns
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_privileged_profile_columns();
