-- ==============================================================================
-- MIGRATION : SUPPRESSION DE L'APPROBATION ADMIN OBLIGATOIRE À L'INSCRIPTION
-- Les nouveaux comptes sont actifs dès la validation du code OTP envoyé par email.
-- L'admin garde la possibilité de suspendre un compte manuellement (statut_compte
-- reste utilisé pour la modération, seul le défaut à l'inscription change).
-- ==============================================================================

-- 1. Remettre le défaut de colonne à 'actif'
ALTER TABLE public.profiles ALTER COLUMN statut_compte SET DEFAULT 'actif';

-- 2. Corriger le trigger d'inscription automatique pour ne plus mettre les
--    nouveaux comptes en 'en_attente'
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
    v_nom := COALESCE(NEW.raw_user_meta_data->>'nom', split_part(NEW.email, '@', 1));
    v_telephone := COALESCE(NEW.raw_user_meta_data->>'telephone', '');
    v_region := COALESCE(NEW.raw_user_meta_data->>'region', 'Thiès');
    v_culture := COALESCE(NEW.raw_user_meta_data->>'culture', 'Oignon');
    v_surface := COALESCE((NEW.raw_user_meta_data->>'surfaceHa')::NUMERIC, 1.0);

    IF LOWER(COALESCE(NEW.email, '')) = 'fayethierno7@gmail.com' THEN
        v_role := 'superadmin';
    ELSE
        v_role := 'producteur';
    END IF;

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
        'actif',
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        nom = EXCLUDED.nom,
        telephone_contact = CASE WHEN EXCLUDED.telephone_contact <> '' THEN EXCLUDED.telephone_contact ELSE profiles.telephone_contact END,
        role = CASE WHEN v_role = 'superadmin' THEN 'superadmin' ELSE profiles.role END;

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
