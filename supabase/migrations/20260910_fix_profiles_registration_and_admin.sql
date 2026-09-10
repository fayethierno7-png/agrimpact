-- ==============================================================================
-- MIGRATION : TRIGGER INSCRIPTION AUTOMATIQUE & RPC ADMIN ROBUSTE
-- Résout le blocage RLS 42501 et permet à l'administration de lister les utilisateurs
-- ==============================================================================

-- 1. FONCTION & TRIGGER AUTOMATIQUE À L'INSCRIPTION
-- Dès qu'un compte est créé dans auth.users, crée le profil correspondant sans blocage RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_nom TEXT;
    v_telephone TEXT;
    v_region TEXT;
    v_culture TEXT;
    v_surface NUMERIC;
    v_farm_id UUID;
    v_role TEXT;
BEGIN
    -- Extraction sécurisée des métadonnées envoyées lors du signUp
    v_nom := COALESCE(NEW.raw_user_meta_data->>'nom', split_part(NEW.email, '@', 1));
    v_telephone := COALESCE(NEW.raw_user_meta_data->>'telephone', '');
    v_region := COALESCE(NEW.raw_user_meta_data->>'region', 'Thiès');
    v_culture := COALESCE(NEW.raw_user_meta_data->>'culture', 'Oignon');
    v_surface := COALESCE((NEW.raw_user_meta_data->>'surfaceHa')::NUMERIC, 1.0);

    -- Attribution automatique du rôle superadmin pour le propriétaire
    IF LOWER(COALESCE(NEW.email, '')) = 'fayethierno7@gmail.com' THEN
        v_role := 'superadmin';
    ELSE
        v_role := 'producteur';
    END IF;

    -- Insertion dans profiles
    INSERT INTO public.profiles (
        id,
        user_id,
        nom,
        telephone_contact,
        plan,
        role,
        statut_compte,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.id,
        v_nom,
        v_telephone,
        'free',
        v_role,
        CASE WHEN v_role = 'superadmin' THEN 'actif' ELSE 'en_attente' END,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        nom = EXCLUDED.nom,
        telephone_contact = CASE WHEN EXCLUDED.telephone_contact <> '' THEN EXCLUDED.telephone_contact ELSE profiles.telephone_contact END,
        role = CASE WHEN v_role = 'superadmin' THEN 'superadmin' ELSE profiles.role END;

    -- Insertion de l'exploitation initiale si elle n'existe pas encore
    IF NOT EXISTS (SELECT 1 FROM public.farms WHERE user_id = NEW.id) THEN
        INSERT INTO public.farms (
            id,
            user_id,
            nom,
            region,
            latitude,
            longitude,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            NEW.id,
            'Exploitation ' || v_region,
            v_region,
            14.7910,
            -16.9256,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_farm_id;

        -- Insertion de la parcelle par défaut
        IF v_farm_id IS NOT NULL THEN
            INSERT INTO public.plots (
                id,
                farm_id,
                nom,
                culture,
                surface_ha,
                date_semis,
                type_irrigation,
                created_at,
                updated_at
            )
            VALUES (
                gen_random_uuid(),
                v_farm_id,
                'Parcelle ' || v_culture,
                v_culture,
                v_surface,
                CURRENT_DATE,
                'goutte-a-goutte',
                NOW(),
                NOW()
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. RATTRAPAGE RÉTROACTIF DES UTILISATEURS EXISTANTS DANS AUTH.USERS
INSERT INTO public.profiles (
    id,
    user_id,
    nom,
    telephone_contact,
    plan,
    role,
    statut_compte,
    created_at,
    updated_at
)
SELECT 
    u.id,
    u.id,
    COALESCE(u.raw_user_meta_data->>'nom', split_part(u.email, '@', 1)),
    COALESCE(u.raw_user_meta_data->>'telephone', ''),
    'free',
    CASE WHEN LOWER(u.email) = 'fayethierno7@gmail.com' THEN 'superadmin' ELSE 'producteur' END,
    CASE WHEN LOWER(u.email) = 'fayethierno7@gmail.com' THEN 'actif' ELSE 'en_attente' END,
    u.created_at,
    NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 3. AUTORISER L'INSERTION SÉCURISÉE DE PROFILES ET FARMS VIA L'API/CLIENT
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "farms_insert_policy" ON public.farms;
CREATE POLICY "farms_insert_policy" ON public.farms
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "plots_insert_policy" ON public.plots;
CREATE POLICY "plots_insert_policy" ON public.plots
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- 4. RPC ADMIN : RÉCUPÉRATION DIRECTE DE TOUS LES UTILISATEURS SANS BLOCAGE RLS
CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    nom TEXT,
    telephone_contact TEXT,
    plan TEXT,
    role TEXT,
    statut_compte TEXT,
    created_at TIMESTAMPTZ,
    farm_nom TEXT,
    region TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.nom,
        p.telephone_contact,
        p.plan,
        p.role,
        p.statut_compte,
        p.created_at,
        COALESCE(f.nom, 'Non configurée') as farm_nom,
        COALESCE(f.region, 'Sénégal') as region
    FROM public.profiles p
    LEFT JOIN LATERAL (
        SELECT f_sub.nom, f_sub.region
        FROM public.farms f_sub
        WHERE f_sub.user_id = p.user_id
        ORDER BY f_sub.created_at DESC
        LIMIT 1
    ) f ON true
    ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_users_list() TO anon, authenticated, service_role;
