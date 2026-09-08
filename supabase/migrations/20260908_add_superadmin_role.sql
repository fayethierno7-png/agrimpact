-- ==============================================================================
-- MIGRATION AGRIMPACT : Activation du Rôle SUPERADMIN pour fayethierno
-- ==============================================================================

-- 1. Élargir la contrainte CHECK de la table profiles pour supporter 'superadmin'
DO $$
BEGIN
    -- Supprimer l'ancienne contrainte si elle existe
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
    END IF;

    -- Réappliquer la contrainte incluant 'superadmin'
    ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('producteur', 'admin', 'superadmin'));
END $$;

-- 2. Mettre à jour le compte utilisateur fayethierno en SUPERADMIN dans profiles
-- Recherche par email lié dans auth.users
UPDATE public.profiles
SET 
    role = 'superadmin',
    statut_compte = 'actif',
    updated_at = NOW()
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%fayethierno%' OR email ILIKE '%thierno%'
);

-- Recherche de secours par le nom de profil ou contact
UPDATE public.profiles
SET 
    role = 'superadmin',
    statut_compte = 'actif',
    updated_at = NOW()
WHERE nom ILIKE '%faye%' AND nom ILIKE '%thierno%';

-- 3. Mise à jour des métadonnées de l'utilisateur dans auth.users (pour les sessions JWT)
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "superadmin"}'::jsonb,
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "superadmin"}'::jsonb
WHERE email ILIKE '%fayethierno%' OR email ILIKE '%thierno%';

-- 4. Insérer une trace d'audit officielle dans audit_log
INSERT INTO public.audit_log (
    admin_nom,
    action,
    cible_type,
    cible_id,
    metadata
)
SELECT 
    'Système AgriImpact',
    'promotion_superadmin',
    'user',
    p.user_id::text,
    jsonb_build_object(
        'nom', p.nom,
        'nouveau_role', 'superadmin',
        'date', NOW()
    )
FROM public.profiles p
WHERE p.role = 'superadmin'
LIMIT 1;

-- 5. Requête de contrôle immédiat (à vérifier dans l'onglet Results)
SELECT 
    p.id,
    p.user_id,
    p.nom,
    p.role,
    p.statut_compte,
    u.email
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE p.role = 'superadmin' 
   OR u.email ILIKE '%fayethierno%' 
   OR p.nom ILIKE '%thierno%';
