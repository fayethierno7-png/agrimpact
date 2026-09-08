-- ==============================================================================
-- MIGRATION AGRIMPACT : Conversion de role en TEXT & Promotion SUPERADMIN
-- Résout l'erreur 22P02: invalid input value for enum user_role
-- ==============================================================================

-- 1. Supprimer l'ancienne contrainte CHECK éventuelle
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
    END IF;
END $$;

-- 2. Convertir la colonne role en type TEXT pour s'affranchir de l'ENUM user_role
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN role TYPE TEXT USING role::text;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'producteur';

-- 3. Mettre à jour le compte utilisateur fayethierno en SUPERADMIN
UPDATE public.profiles
SET 
    role = 'superadmin',
    statut_compte = 'actif',
    updated_at = NOW()
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%fayethierno%' OR email ILIKE '%thierno%'
);

-- Mise à jour de secours si le nom correspond
UPDATE public.profiles
SET 
    role = 'superadmin',
    statut_compte = 'actif',
    updated_at = NOW()
WHERE nom ILIKE '%faye%' AND nom ILIKE '%thierno%';

-- 4. Mise à jour des métadonnées auth.users pour les tokens de session
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "superadmin"}'::jsonb,
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "superadmin"}'::jsonb
WHERE email ILIKE '%fayethierno%' OR email ILIKE '%thierno%';

-- 5. Contrôle du résultat
SELECT 
    p.id,
    p.user_id,
    p.nom,
    p.role,
    p.statut_compte,
    u.email
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE u.email ILIKE '%fayethierno%' 
   OR u.email ILIKE '%thierno%'
   OR p.role IN ('admin', 'superadmin');
