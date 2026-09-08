-- ==============================================================================
-- AGRIMPACT : Migration Moteur de Prédiction Agrométéorologique
-- Calcul du risque de mildiou à 14 jours, simulation d'impact de rendement
-- et fenêtres optimales d'intervention de traitement.
-- S'interface avec les tables existantes (farms, plots, weather_cache) sans les altérer.
-- ==============================================================================

-- 1. Table de référence : Paramètres épidémiologiques et agronomiques par culture
CREATE TABLE IF NOT EXISTS public.agrometeo_disease_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    culture TEXT NOT NULL UNIQUE, -- Oignon, Tomate, Arachide, Maïs, Piment
    maladie_principale TEXT NOT NULL, -- ex: Mildiou (Peronospora destructor), Mildiou (Phytophthora infestans), Cercosporiose / Rouille
    pathogene_scientifique TEXT NOT NULL,
    temp_min NUMERIC(4, 1) NOT NULL DEFAULT 10.0,
    temp_opt_basse NUMERIC(4, 1) NOT NULL DEFAULT 18.0,
    temp_opt_haute NUMERIC(4, 1) NOT NULL DEFAULT 24.0,
    temp_max NUMERIC(4, 1) NOT NULL DEFAULT 30.0,
    humidite_seuil_infection NUMERIC(4, 1) NOT NULL DEFAULT 65.0, -- Humidité relative minimale pour germination
    humidite_optimale NUMERIC(4, 1) NOT NULL DEFAULT 85.0,
    pluie_declenchement_mm NUMERIC(4, 1) NOT NULL DEFAULT 1.0,
    sensibilite_culture NUMERIC(3, 2) NOT NULL DEFAULT 1.00, -- Facteur de réceptivité foliaire
    rendement_nominal_kg_ha NUMERIC(8, 1) NOT NULL DEFAULT 25000.0, -- Rendement de référence moyen au Sénégal
    prix_indicatif_cfa_kg NUMERIC(6, 1) NOT NULL DEFAULT 350.0, -- Prix indicatif de vente au producteur
    description_symptomes TEXT,
    methodes_lutte TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Données agronomiques certifiées de référence (Sénégal - ISRA / ANACIM)
INSERT INTO public.agrometeo_disease_parameters 
(culture, maladie_principale, pathogene_scientifique, temp_min, temp_opt_basse, temp_opt_haute, temp_max, humidite_seuil_infection, humidite_optimale, pluie_declenchement_mm, sensibilite_culture, rendement_nominal_kg_ha, prix_indicatif_cfa_kg, description_symptomes, methodes_lutte)
VALUES
(
    'Oignon',
    'Mildiou de l''oignon',
    'Peronospora destructor',
    8.0, 16.0, 22.0, 28.0, 68.0, 85.0, 1.0, 0.95, 30000.0, 400.0,
    'Taches décolorées ovales sur les feuilles les plus anciennes, feutrage violacé par temps très humide, dessèchement apical du feuillage.',
    'Éviter l''irrigation par submersion tardive, rotation cultural 3 ans minimum, application préventive de cuivre ou fongicide systémique homologué dès J+3 de risque élevé.'
),
(
    'Tomate',
    'Mildiou de la tomate',
    'Phytophthora infestans',
    10.0, 18.0, 24.0, 29.0, 70.0, 90.0, 1.5, 1.00, 35000.0, 450.0,
    'Taches d''aspect huileux brun-noirâtre sur feuilles et tiges, pourriture marbrée des fruits verts ou mûrs, effondrement rapide du feuillage.',
    'Aération maximale du feuillage, suppression des feuilles basses en contact avec le sol, pulvérisation préventive en fenêtre météo calme (< 15 km/h de vent).'
),
(
    'Arachide',
    'Cercosporiose & Rouille de l''arachide',
    'Cercospora arachidicola / Puccinia arachidis',
    15.0, 22.0, 28.0, 34.0, 65.0, 85.0, 2.0, 0.85, 2200.0, 350.0,
    'Taches circulaires brunes cerclées d''un halo jaune sur les folioles, défoliation précoce massive entraînant une mauvaise maturation des gousses souterraines.',
    'Semis précoce avec variétés tolérantes certifiées (ex: 55-437, Fleur 11), enfouissement des résidus de récolte précédente, traitement fongicide ciblé à la floraison.'
),
(
    'Maïs',
    'Helminthosporiose & Rouille américaine',
    'Bipolaris maydis / Puccinia sorghi',
    12.0, 20.0, 26.0, 32.0, 70.0, 88.0, 2.5, 0.45, 4500.0, 250.0,
    'Lésions allongées brun clair parallèles aux nervures foliaires, pustules brun-rouille sur les deux faces du limbe.',
    'Densité de semis maîtrisée, équilibre de fumure azotée/potassique, protection fongicide si attaque avant le stade de remplissage du grain.'
),
(
    'Piment',
    'Anthracnose & Mildiou capsici',
    'Phytophthora capsici / Colletotrichum spp.',
    12.0, 20.0, 27.0, 32.0, 65.0, 88.0, 1.0, 0.75, 12000.0, 750.0,
    'Flétrissement soudain sans jaunissement préalable, collet noir et nécrosé, pourriture aqueuse des fruits.',
    'Buttage des plants pour éviter le contact direct du collet avec l''eau d''irrigation, paillage des interlignes, drainage efficace des parcelles.'
)
ON CONFLICT (culture) DO UPDATE SET
    maladie_principale = EXCLUDED.maladie_principale,
    pathogene_scientifique = EXCLUDED.pathogene_scientifique,
    temp_min = EXCLUDED.temp_min,
    temp_opt_basse = EXCLUDED.temp_opt_basse,
    temp_opt_haute = EXCLUDED.temp_opt_haute,
    temp_max = EXCLUDED.temp_max,
    humidite_seuil_infection = EXCLUDED.humidite_seuil_infection,
    humidite_optimale = EXCLUDED.humidite_optimale,
    pluie_declenchement_mm = EXCLUDED.pluie_declenchement_mm,
    sensibilite_culture = EXCLUDED.sensibilite_culture,
    rendement_nominal_kg_ha = EXCLUDED.rendement_nominal_kg_ha,
    prix_indicatif_cfa_kg = EXCLUDED.prix_indicatif_cfa_kg,
    description_symptomes = EXCLUDED.description_symptomes,
    methodes_lutte = EXCLUDED.methodes_lutte;


-- 2. Table: agrometeo_14d_predictions (En-tête de session de prédiction à 14 jours par parcelle)
CREATE TABLE IF NOT EXISTS public.agrometeo_14d_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    date_calcul TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_debut_horizon DATE NOT NULL,
    date_fin_horizon DATE NOT NULL,
    
    -- Synthèse du risque épidémique
    score_risque_global NUMERIC(5, 2) NOT NULL CHECK (score_risque_global BETWEEN 0 AND 100),
    niveau_vigilance TEXT NOT NULL CHECK (niveau_vigilance IN ('verte', 'jaune', 'orange', 'rouge')),
    jours_a_risque_eleve INTEGER NOT NULL DEFAULT 0,
    pic_risque_date DATE,
    pic_risque_valeur NUMERIC(5, 2),
    
    -- Simulation de rendement et perte financière
    stade_phenologique_nom TEXT NOT NULL,
    jours_apres_semis INTEGER NOT NULL,
    facteur_sensibilite_stade NUMERIC(3, 2) NOT NULL DEFAULT 1.0,
    perte_rendement_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (perte_rendement_pct BETWEEN 0 AND 100),
    perte_rendement_kg NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    perte_financiere_cfa NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    gain_potentiel_traitement_cfa NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    
    -- Synthèse des fenêtres de traitement
    nb_fenetres_optimales INTEGER NOT NULL DEFAULT 0,
    nb_fenetres_favorables INTEGER NOT NULL DEFAULT 0,
    nb_fenetres_interdites INTEGER NOT NULL DEFAULT 0,
    prochaine_fenetre_optimale TIMESTAMPTZ,
    
    conseil_strategique TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 3. Table: agrometeo_daily_disease_risk (Risque journalier détaillé sur 14 jours)
CREATE TABLE IF NOT EXISTS public.agrometeo_daily_disease_risk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID NOT NULL REFERENCES public.agrometeo_14d_predictions(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    jour_horizon INTEGER NOT NULL CHECK (jour_horizon BETWEEN 1 AND 14),
    date_jour DATE NOT NULL,
    
    -- Données météo d'entrée réelles
    temp_min NUMERIC(4, 1) NOT NULL,
    temp_max NUMERIC(4, 1) NOT NULL,
    temp_moyenne NUMERIC(4, 1) NOT NULL,
    humidite_moyenne INTEGER NOT NULL,
    humidite_max INTEGER NOT NULL,
    pluie_somme_mm NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    pluie_probabilite_pct INTEGER NOT NULL DEFAULT 0,
    vent_vitesse_max_kmh NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    
    -- Indices épidémiologiques calculés
    facteur_thermique NUMERIC(4, 3) NOT NULL,
    facteur_hygrometrique NUMERIC(4, 3) NOT NULL,
    facteur_pluie NUMERIC(4, 3) NOT NULL,
    indice_infection_journalier NUMERIC(5, 2) NOT NULL CHECK (indice_infection_journalier BETWEEN 0 AND 100),
    jours_favorables_consecutifs INTEGER NOT NULL DEFAULT 0,
    stade_incubation TEXT NOT NULL CHECK (stade_incubation IN ('dormant', 'germination', 'incubation_active', 'sporulation_imminente', 'invasion')),
    niveau_vigilance TEXT NOT NULL CHECK (niveau_vigilance IN ('verte', 'jaune', 'orange', 'rouge')),
    alerte_active BOOLEAN NOT NULL DEFAULT FALSE,
    recommandation_courte TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_prediction_day UNIQUE (prediction_id, jour_horizon)
);


-- 4. Table: agrometeo_intervention_windows (Fenêtres optimales d'intervention sur 14 jours)
CREATE TABLE IF NOT EXISTS public.agrometeo_intervention_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID NOT NULL REFERENCES public.agrometeo_14d_predictions(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    date_jour DATE NOT NULL,
    creneau TEXT NOT NULL CHECK (creneau IN ('matin_06h_10h', 'apres_midi_16h_19h')),
    
    -- Paramètres micrométéorologiques du créneau
    temperature_creneau NUMERIC(4, 1) NOT NULL,
    humidite_creneau INTEGER NOT NULL,
    vitesse_vent_kmh NUMERIC(4, 1) NOT NULL,
    pluie_prevue_mm NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    pluie_probabilite_pct INTEGER NOT NULL DEFAULT 0,
    
    -- Évaluation biophysique
    aptitude_vent TEXT NOT NULL CHECK (aptitude_vent IN ('optimale', 'limite', 'trop_fort_interdit')),
    aptitude_lessivage TEXT NOT NULL CHECK (aptitude_lessivage IN ('sec_optimal', 'risque_moyen', 'lessivage_imminent_interdit')),
    aptitude_temperature TEXT NOT NULL CHECK (aptitude_temperature IN ('optimale', 'trop_frais', 'trop_chaud_brulure_interdit')),
    
    score_aptitude_global INTEGER NOT NULL CHECK (score_aptitude_global BETWEEN 0 AND 100),
    statut_fenetre TEXT NOT NULL CHECK (statut_fenetre IN ('optimale', 'favorable', 'delicate', 'interdite')),
    justification_technique TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==============================================================================
-- INDEX DE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_agrometeo_pred_plot ON public.agrometeo_14d_predictions(plot_id, date_calcul DESC);
CREATE INDEX IF NOT EXISTS idx_agrometeo_pred_vigilance ON public.agrometeo_14d_predictions(niveau_vigilance);
CREATE INDEX IF NOT EXISTS idx_agrometeo_daily_pred_id ON public.agrometeo_daily_disease_risk(prediction_id, jour_horizon);
CREATE INDEX IF NOT EXISTS idx_agrometeo_daily_plot_date ON public.agrometeo_daily_disease_risk(plot_id, date_jour);
CREATE INDEX IF NOT EXISTS idx_agrometeo_windows_pred_id ON public.agrometeo_intervention_windows(prediction_id, date_jour);
CREATE INDEX IF NOT EXISTS idx_agrometeo_windows_statut ON public.agrometeo_intervention_windows(statut_fenetre);


-- ==============================================================================
-- SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- Les producteurs n'accèdent qu'aux prédictions rattachées à leurs propres parcelles
-- ==============================================================================
ALTER TABLE public.agrometeo_disease_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agrometeo_14d_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agrometeo_daily_disease_risk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agrometeo_intervention_windows ENABLE ROW LEVEL SECURITY;

-- 1. Paramètres de référence : lecture publique authentifiée
DROP POLICY IF EXISTS "Disease parameters read for authenticated" ON public.agrometeo_disease_parameters;
CREATE POLICY "Disease parameters read for authenticated"
    ON public.agrometeo_disease_parameters FOR SELECT
    TO authenticated
    USING (true);

-- 2. Predictions 14j : accès strict aux parcelles de l'utilisateur
DROP POLICY IF EXISTS "Users can manage agrometeo predictions for own plots" ON public.agrometeo_14d_predictions;
CREATE POLICY "Users can manage agrometeo predictions for own plots"
    ON public.agrometeo_14d_predictions FOR ALL
    TO authenticated
    USING (
        plot_id IN (
            SELECT p.id FROM public.plots p
            JOIN public.farms f ON p.farm_id = f.id
            WHERE f.user_id = auth.uid()
        )
    )
    WITH CHECK (
        plot_id IN (
            SELECT p.id FROM public.plots p
            JOIN public.farms f ON p.farm_id = f.id
            WHERE f.user_id = auth.uid()
        )
    );

-- 3. Daily risk : accès strict aux parcelles de l'utilisateur
DROP POLICY IF EXISTS "Users can manage daily risk for own plots" ON public.agrometeo_daily_disease_risk;
CREATE POLICY "Users can manage daily risk for own plots"
    ON public.agrometeo_daily_disease_risk FOR ALL
    TO authenticated
    USING (
        plot_id IN (
            SELECT p.id FROM public.plots p
            JOIN public.farms f ON p.farm_id = f.id
            WHERE f.user_id = auth.uid()
        )
    )
    WITH CHECK (
        plot_id IN (
            SELECT p.id FROM public.plots p
            JOIN public.farms f ON p.farm_id = f.id
            WHERE f.user_id = auth.uid()
        )
    );

-- 4. Intervention windows : accès strict aux parcelles de l'utilisateur
DROP POLICY IF EXISTS "Users can manage intervention windows for own plots" ON public.agrometeo_intervention_windows;
CREATE POLICY "Users can manage intervention windows for own plots"
    ON public.agrometeo_intervention_windows FOR ALL
    TO authenticated
    USING (
        plot_id IN (
            SELECT p.id FROM public.plots p
            JOIN public.farms f ON p.farm_id = f.id
            WHERE f.user_id = auth.uid()
        )
    )
    WITH CHECK (
        plot_id IN (
            SELECT p.id FROM public.plots p
            JOIN public.farms f ON p.farm_id = f.id
            WHERE f.user_id = auth.uid()
        )
    );


-- ==============================================================================
-- FONCTIONS STOCKÉES POSTGRESQL (PL/pgSQL)
-- Logique mathématique et agronomique embarquée dans la base de données
-- ==============================================================================

-- A. Calcul du risque journalier de mildiou / maladie fongique
CREATE OR REPLACE FUNCTION public.calculate_mildew_infection_risk(
    p_temp_moyenne NUMERIC,
    p_humidite_moyenne NUMERIC,
    p_humidite_max NUMERIC,
    p_pluie_mm NUMERIC,
    p_pluie_prob INTEGER,
    p_sensibilite_culture NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_ft NUMERIC;
    v_frh NUMERIC;
    v_fp NUMERIC;
    v_rh_effectif NUMERIC;
    v_risk NUMERIC;
    v_vigilance TEXT;
BEGIN
    -- 1. Facteur thermique (Courbe symétrique centrée sur 21°C)
    -- Nul si T < 8°C ou T > 32°C
    IF p_temp_moyenne < 8.0 OR p_temp_moyenne > 32.0 THEN
        v_ft := 0.0;
    ELSE
        v_ft := GREATEST(0.0, 1.0 - POWER((p_temp_moyenne - 21.0) / 11.0, 2));
    END IF;

    -- 2. Facteur hygrométrique (Humidité foliaire)
    -- Moyenne pondérée favorisant l'hygrométrie nocturne (max)
    v_rh_effectif := (p_humidite_moyenne * 0.4) + (p_humidite_max * 0.6);
    IF v_rh_effectif < 65.0 THEN
        v_frh := 0.0;
    ELSE
        v_frh := LEAST(1.0, (v_rh_effectif - 65.0) / 25.0);
    END IF;

    -- 3. Facteur de pluie / mouillure
    IF p_pluie_mm > 0.0 OR p_pluie_prob >= 40 THEN
        v_fp := LEAST(1.0, 0.25 + 0.75 * LEAST(1.0, p_pluie_mm / 4.0));
    ELSE
        v_fp := 0.30; -- Mouillure par rosée matinale résiduelle si forte humidité
    END IF;

    -- 4. Calcul de l'indice composite final (0 à 100%)
    v_risk := ROUND(LEAST(100.0, 100.0 * v_ft * v_frh * v_fp * p_sensibilite_culture), 2);

    -- 5. Seuil de vigilance
    IF v_risk >= 75.0 THEN
        v_vigilance := 'rouge';
    ELSIF v_risk >= 55.0 THEN
        v_vigilance := 'orange';
    ELSIF v_risk >= 30.0 THEN
        v_vigilance := 'jaune';
    ELSE
        v_vigilance := 'verte';
    END IF;

    RETURN jsonb_build_object(
        'facteur_thermique', ROUND(v_ft, 3),
        'facteur_hygrometrique', ROUND(v_frh, 3),
        'facteur_pluie', ROUND(v_fp, 3),
        'indice_infection', v_risk,
        'vigilance', v_vigilance
    );
END;
$$;


-- B. Simulation d'impact de rendement et pertes financières
CREATE OR REPLACE FUNCTION public.calculate_plot_yield_impact(
    p_plot_id UUID,
    p_avg_risk NUMERIC,
    p_consecutive_critical_days INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_culture TEXT;
    v_surface NUMERIC;
    v_date_semis DATE;
    v_irrigation TEXT;
    v_jours_semis INTEGER;
    v_rendement_ref NUMERIC;
    v_prix_kg NUMERIC;
    v_ks NUMERIC := 1.0;
    v_stade_nom TEXT := 'Végétatif';
    v_c_irrigation NUMERIC := 1.0;
    v_perte_pct NUMERIC;
    v_perte_kg NUMERIC;
    v_perte_cfa NUMERIC;
    v_gain_evitable_cfa NUMERIC;
BEGIN
    -- Récupération de la parcelle réelle
    SELECT culture, surface_ha, date_semis, type_irrigation
    INTO v_culture, v_surface, v_date_semis, v_irrigation
    FROM public.plots
    WHERE id = p_plot_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    v_jours_semis := GREATEST(0, (CURRENT_DATE - v_date_semis));

    -- Récupération des paramètres de rendement nominal
    SELECT rendement_nominal_kg_ha, prix_indicatif_cfa_kg
    INTO v_rendement_ref, v_prix_kg
    FROM public.agrometeo_disease_parameters
    WHERE culture = v_culture;

    IF NOT FOUND THEN
        v_rendement_ref := 20000.0;
        v_prix_kg := 350.0;
    END IF;

    -- Facteur de sensibilité phénologique (Ks) selon la culture et l'âge
    IF v_culture = 'Oignon' THEN
        IF v_jours_semis <= 15 THEN
            v_ks := 0.75; v_stade_nom := 'Levée & Reprise';
        ELSIF v_jours_semis <= 35 THEN
            v_ks := 1.00; v_stade_nom := 'Développement végétatif';
        ELSIF v_jours_semis <= 70 THEN
            v_ks := 1.45; v_stade_nom := 'Bulbaison (Critique)';
        ELSE
            v_ks := 0.50; v_stade_nom := 'Maturation & Arrêt d''eau';
        END IF;
    ELSIF v_culture = 'Tomate' THEN
        IF v_jours_semis <= 12 THEN
            v_ks := 0.80; v_stade_nom := 'Reprise';
        ELSIF v_jours_semis <= 35 THEN
            v_ks := 1.10; v_stade_nom := 'Végétation';
        ELSIF v_jours_semis <= 60 THEN
            v_ks := 1.50; v_stade_nom := 'Floraison & Nouaison (Critique)';
        ELSE
            v_ks := 0.65; v_stade_nom := 'Récolte continue';
        END IF;
    ELSIF v_culture = 'Arachide' THEN
        IF v_jours_semis <= 10 THEN
            v_ks := 0.70; v_stade_nom := 'Levée';
        ELSIF v_jours_semis <= 35 THEN
            v_ks := 1.15; v_stade_nom := 'Floraison';
        ELSIF v_jours_semis <= 70 THEN
            v_ks := 1.40; v_stade_nom := 'Fructification & Gynophores (Critique)';
        ELSE
            v_ks := 0.55; v_stade_nom := 'Maturation';
        END IF;
    ELSE
        v_ks := 1.00; v_stade_nom := 'Plein cycle';
    END IF;

    -- Modificateur selon le mode d'irrigation
    IF v_irrigation = 'submersion' THEN
        v_c_irrigation := 1.20; -- Forte humidité résiduelle au collet
    ELSIF v_irrigation = 'goutte-a-goutte' THEN
        v_c_irrigation := 0.85; -- Canopée plus sèche
    ELSE
        v_c_irrigation := 1.00; -- Pluviale
    END IF;

    -- Équation d'impact de rendement :
    -- Perte % = f(Risque moyen, Jours consécutifs critiques, Sensibilité stade, Irrigation)
    v_perte_pct := ROUND(LEAST(80.0, (p_avg_risk / 100.0) * (0.35 + (p_consecutive_critical_days * 0.08)) * v_ks * v_c_irrigation * 100.0), 2);
    
    -- Calculs quantitatifs réels
    v_perte_kg := ROUND(v_surface * v_rendement_ref * (v_perte_pct / 100.0), 1);
    v_perte_cfa := ROUND(v_perte_kg * v_prix_kg, 0);
    v_gain_evitable_cfa := ROUND(v_perte_cfa * 0.82, 0); -- 82% d'efficacité moyenne d'un traitement préventif

    RETURN jsonb_build_object(
        'culture', v_culture,
        'surface_ha', v_surface,
        'jours_apres_semis', v_jours_semis,
        'stade_phenologique', v_stade_nom,
        'facteur_sensibilite_ks', v_ks,
        'perte_rendement_pct', v_perte_pct,
        'perte_rendement_kg', v_perte_kg,
        'perte_financiere_cfa', v_perte_cfa,
        'gain_potentiel_cfa', v_gain_evitable_cfa
    );
END;
$$;


-- C. Évaluation d'une fenêtre de traitement (Créneau horaire)
CREATE OR REPLACE FUNCTION public.evaluate_intervention_slot(
    p_temp NUMERIC,
    p_wind_kmh NUMERIC,
    p_rain_mm NUMERIC,
    p_rain_prob INTEGER,
    p_rh INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_apt_vent TEXT;
    v_apt_pluie TEXT;
    v_apt_temp TEXT;
    v_score INTEGER := 100;
    v_statut TEXT;
    v_justification TEXT := '';
BEGIN
    -- 1. Critère Vent (Dérive)
    IF p_wind_kmh > 19.0 THEN
        v_apt_vent := 'trop_fort_interdit';
        v_score := v_score - 50;
        v_justification := v_justification || 'Vent excessif (' || p_wind_kmh || ' km/h > 19 km/h) : risque majeur de dérive. ';
    ELSIF p_wind_kmh > 12.0 THEN
        v_apt_vent := 'limite';
        v_score := v_score - 15;
        v_justification := v_justification || 'Vent modéré (' || p_wind_kmh || ' km/h) : utilisez des buses anti-dérive. ';
    ELSE
        v_apt_vent := 'optimale';
    END IF;

    -- 2. Critère Pluie / Lessivage
    IF p_rain_mm >= 1.5 OR p_rain_prob >= 60 THEN
        v_apt_pluie := 'lessivage_imminent_interdit';
        v_score := v_score - 60;
        v_justification := v_justification || 'Pluie prévue (' || p_rain_mm || ' mm, ' || p_rain_prob || '%) : lessivage total de la bouillie. ';
    ELSIF p_rain_mm > 0.0 OR p_rain_prob >= 30 THEN
        v_apt_pluie := 'risque_moyen';
        v_score := v_score - 25;
        v_justification := v_justification || 'Risque d''ondée (' || p_rain_prob || '%) : privilégiez un adjuvant fixateur. ';
    ELSE
        v_apt_pluie := 'sec_optimal';
    END IF;

    -- 3. Critère Température (Brûlure phytotoxique & évaporation)
    IF p_temp >= 31.0 THEN
        v_apt_temp := 'trop_chaud_brulure_interdit';
        v_score := v_score - 45;
        v_justification := v_justification || 'Température trop élevée (' || p_temp || '°C >= 31°C) : risque de brûlure foliaire et volatilisation. ';
    ELSIF p_temp < 15.0 THEN
        v_apt_temp := 'trop_frais';
        v_score := v_score - 15;
        v_justification := v_justification || 'Température fraîche (' || p_temp || '°C) : assimilation systémique ralentie. ';
    ELSE
        v_apt_temp := 'optimale';
    END IF;

    -- Clamp score
    v_score := GREATEST(0, LEAST(100, v_score));

    -- Statut global
    IF v_apt_vent = 'trop_fort_interdit' OR v_apt_pluie = 'lessivage_imminent_interdit' OR v_apt_temp = 'trop_chaud_brulure_interdit' OR v_score < 40 THEN
        v_statut := 'interdite';
        IF v_justification = '' THEN v_justification := 'Conditions non favorables à l''application phytosanitaire.'; END IF;
    ELSIF v_score >= 80 THEN
        v_statut := 'optimale';
        v_justification := 'Excellentes conditions : vent calme, feuillage sec et température idéale.';
    ELSIF v_score >= 60 THEN
        v_statut := 'favorable';
        IF v_justification = '' THEN v_justification := 'Conditions globalement bonnes avec précautions mineures.'; END IF;
    ELSE
        v_statut := 'delicate';
    END IF;

    RETURN jsonb_build_object(
        'score', v_score,
        'statut', v_statut,
        'aptitude_vent', v_apt_vent,
        'aptitude_lessivage', v_apt_pluie,
        'aptitude_temperature', v_apt_temp,
        'justification', TRIM(v_justification)
    );
END;
$$;
