-- ==============================================================================
-- MIGRATION AGRIMPACT : Activation SUPERADMIN (Version simplifiée et robuste)
-- ==============================================================================

-- 1. Forcer la colonne role en TEXT pour éviter tout conflit avec un type ENUM existant
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN role TYPE TEXT USING role::text;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'producteur';

-- 2. Supprimer l'ancienne contrainte CHECK sur role si présente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
    END IF;
END $$;

-- 3. Promouvoir le compte utilisateur fayethierno en SUPERADMIN
-- On utilise uniquement l'email via auth.users pour éviter l'erreur sur la colonne "nom"
UPDATE public.profiles
SET role = 'superadmin'
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%fayethierno%' OR email ILIKE '%thierno%'
);

-- 4. Mettre à jour les métadonnées auth.users pour les tokens JWT
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "superadmin"}'::jsonb,
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "superadmin"}'::jsonb
WHERE email ILIKE '%fayethierno%' OR email ILIKE '%thierno%';

-- 5. Contrôle immédiat du résultat (affiché dans l'onglet Results)
SELECT 
    p.id,
    p.user_id,
    p.role,
    u.email
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE u.email ILIKE '%fayethierno%' 
   OR u.email ILIKE '%thierno%'
   OR p.role IN ('admin', 'superadmin');
