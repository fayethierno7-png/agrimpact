-- ==========================================================
-- AGRIMPACT : Schéma de données PostgreSQL / Supabase
-- SaaS de conseil agricole et météo pour le Sénégal
-- ==========================================================

-- Active l'extension UUID si nécessaire
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    telephone_contact TEXT, -- simple champ contact, non utilisé pour l'auth
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
    avatar_url TEXT,
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    role TEXT NOT NULL DEFAULT 'producteur' CHECK (role IN ('producteur', 'admin')),
    statut_compte TEXT NOT NULL DEFAULT 'actif' CHECK (statut_compte IN ('actif', 'suspendu', 'en_attente')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_profile_user UNIQUE (user_id)
);

-- 2. Table: farms (exploitations)
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    region TEXT NOT NULL, -- Thiès, Saint-Louis, Kaolack, etc.
    latitude DOUBLE PRECISION NOT NULL DEFAULT 14.7910,
    longitude DOUBLE PRECISION NOT NULL DEFAULT -16.9256,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table: plots (parcelles)
CREATE TABLE IF NOT EXISTS public.plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    nom TEXT NOT NULL DEFAULT 'Parcelle 1',
    culture TEXT NOT NULL, -- Oignon, Tomate, Maïs, Arachide, Piment, etc.
    surface_ha NUMERIC(6, 2) NOT NULL DEFAULT 1.0,
    date_semis DATE NOT NULL,
    type_irrigation TEXT NOT NULL CHECK (type_irrigation IN ('goutte-a-goutte', 'submersion', 'pluviale')),
    variete TEXT, -- ex: Violet de Galmi
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table: weather_cache
CREATE TABLE IF NOT EXISTS public.weather_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    temperature NUMERIC(4, 1) NOT NULL,
    pluie_pct INTEGER NOT NULL,
    humidite INTEGER NOT NULL,
    vent NUMERIC(4, 1) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    raw_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table: recommendations
CREATE TABLE IF NOT EXISTS public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    titre TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- irrigation, traitement, fertilisation, alerte_chaleur, sanitaire
    priorite TEXT NOT NULL DEFAULT 'normale' CHECK (priorite IN ('basse', 'normale', 'haute', 'urgente')),
    statut TEXT NOT NULL DEFAULT 'pending' CHECK (statut IN ('pending', 'applied', 'dismissed')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Table: alerts
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plot_id UUID REFERENCES public.plots(id) ON DELETE SET NULL,
    titre TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- meteo_extreme, ravageur, secheresse, inondation
    vigilance TEXT NOT NULL DEFAULT 'orange' CHECK (vigilance IN ('verte', 'jaune', 'orange', 'rouge')),
    statut TEXT NOT NULL DEFAULT 'active' CHECK (statut IN ('active', 'resolved', 'past')),
    impact_direct TEXT,
    consignes TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table: subscriptions (pour monétisation récurrente Wave / Orange Money)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'business')),
    statut TEXT NOT NULL DEFAULT 'active' CHECK (statut IN ('active', 'canceled', 'expired', 'past_due')),
    provider TEXT DEFAULT 'wave' CHECK (provider IN ('wave', 'orange_money', 'manual')),
    provider_subscription_id TEXT,
    montant_cfa INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles: lecture et écriture pour le propriétaire uniquement
CREATE POLICY "Users can manage own profile"
    ON public.profiles FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Farms: accès uniquement par le propriétaire
CREATE POLICY "Users can manage own farms"
    ON public.farms FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Plots: accès uniquement si la ferme appartient à l'utilisateur
CREATE POLICY "Users can manage own plots"
    ON public.plots FOR ALL
    USING (
        farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())
    )
    WITH CHECK (
        farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())
    );

-- Weather Cache: accès uniquement pour ses parcelles
CREATE POLICY "Users can view weather cache for own plots"
    ON public.weather_cache FOR ALL
    USING (
        plot_id IN (
            SELECT p.id FROM public.plots p
            JOIN public.farms f ON p.farm_id = f.id
            WHERE f.user_id = auth.uid()
        )
    );

-- Recommendations: accès et modification (statut appliqué) pour ses parcelles
CREATE POLICY "Users can manage recommendations for own plots"
    ON public.recommendations FOR ALL
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

-- Alerts: lecture et mise à jour pour l'utilisateur concerné
CREATE POLICY "Users can manage own alerts"
    ON public.alerts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Subscriptions: lecture pour le propriétaire
CREATE POLICY "Users can view own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- ==========================================================
-- INDEXES DE PERFORMANCE
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON public.farms(user_id);
CREATE INDEX IF NOT EXISTS idx_plots_farm_id ON public.plots(farm_id);
CREATE INDEX IF NOT EXISTS idx_weather_cache_plot_date ON public.weather_cache(plot_id, date);
CREATE INDEX IF NOT EXISTS idx_recommendations_plot_date ON public.recommendations(plot_id, date);
CREATE INDEX IF NOT EXISTS idx_alerts_user_statut ON public.alerts(user_id, statut);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, statut);

-- 8. Table: reports (Signalements producteurs)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('recommandation_incorrecte', 'bug_technique', 'donnee_meteo_incorrecte', 'autre')),
    description TEXT NOT NULL CHECK (length(trim(description)) >= 10),
    statut TEXT NOT NULL DEFAULT 'nouveau' CHECK (statut IN ('nouveau', 'en_cours', 'resolu')),
    admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
    ON public.reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_statut ON public.reports(statut);

-- ==========================================================
-- 9. MOTEUR DE PRÉDICTION AGROMÉTÉOROLOGIQUE (Mildiou 14j & Rendement)
-- ==========================================================

-- Table 9: Paramètres épidémiologiques et agronomiques par culture
CREATE TABLE IF NOT EXISTS public.agrometeo_disease_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    culture TEXT NOT NULL UNIQUE,
    maladie_principale TEXT NOT NULL,
    pathogene_scientifique TEXT NOT NULL,
    temp_min NUMERIC(4, 1) NOT NULL DEFAULT 10.0,
    temp_opt_basse NUMERIC(4, 1) NOT NULL DEFAULT 18.0,
    temp_opt_haute NUMERIC(4, 1) NOT NULL DEFAULT 24.0,
    temp_max NUMERIC(4, 1) NOT NULL DEFAULT 30.0,
    humidite_seuil_infection NUMERIC(4, 1) NOT NULL DEFAULT 65.0,
    humidite_optimale NUMERIC(4, 1) NOT NULL DEFAULT 85.0,
    pluie_declenchement_mm NUMERIC(4, 1) NOT NULL DEFAULT 1.0,
    sensibilite_culture NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
    rendement_nominal_kg_ha NUMERIC(8, 1) NOT NULL DEFAULT 25000.0,
    prix_indicatif_cfa_kg NUMERIC(6, 1) NOT NULL DEFAULT 350.0,
    description_symptomes TEXT,
    methodes_lutte TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 10: En-tête des prédictions à 14 jours par parcelle
CREATE TABLE IF NOT EXISTS public.agrometeo_14d_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    date_calcul TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date_debut_horizon DATE NOT NULL,
    date_fin_horizon DATE NOT NULL,
    score_risque_global NUMERIC(5, 2) NOT NULL CHECK (score_risque_global BETWEEN 0 AND 100),
    niveau_vigilance TEXT NOT NULL CHECK (niveau_vigilance IN ('verte', 'jaune', 'orange', 'rouge')),
    jours_a_risque_eleve INTEGER NOT NULL DEFAULT 0,
    pic_risque_date DATE,
    pic_risque_valeur NUMERIC(5, 2),
    stade_phenologique_nom TEXT NOT NULL,
    jours_apres_semis INTEGER NOT NULL,
    facteur_sensibilite_stade NUMERIC(3, 2) NOT NULL DEFAULT 1.0,
    perte_rendement_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (perte_rendement_pct BETWEEN 0 AND 100),
    perte_rendement_kg NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    perte_financiere_cfa NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    gain_potentiel_traitement_cfa NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    nb_fenetres_optimales INTEGER NOT NULL DEFAULT 0,
    nb_fenetres_favorables INTEGER NOT NULL DEFAULT 0,
    nb_fenetres_interdites INTEGER NOT NULL DEFAULT 0,
    prochaine_fenetre_optimale TIMESTAMPTZ,
    conseil_strategique TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 11: Risque journalier détaillé sur 14 jours
CREATE TABLE IF NOT EXISTS public.agrometeo_daily_disease_risk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID NOT NULL REFERENCES public.agrometeo_14d_predictions(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    jour_horizon INTEGER NOT NULL CHECK (jour_horizon BETWEEN 1 AND 14),
    date_jour DATE NOT NULL,
    temp_min NUMERIC(4, 1) NOT NULL,
    temp_max NUMERIC(4, 1) NOT NULL,
    temp_moyenne NUMERIC(4, 1) NOT NULL,
    humidite_moyenne INTEGER NOT NULL,
    humidite_max INTEGER NOT NULL,
    pluie_somme_mm NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    pluie_probabilite_pct INTEGER NOT NULL DEFAULT 0,
    vent_vitesse_max_kmh NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
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

-- Table 12: Fenêtres optimales d'intervention
CREATE TABLE IF NOT EXISTS public.agrometeo_intervention_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID NOT NULL REFERENCES public.agrometeo_14d_predictions(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    date_jour DATE NOT NULL,
    creneau TEXT NOT NULL CHECK (creneau IN ('matin_06h_10h', 'apres_midi_16h_19h')),
    temperature_creneau NUMERIC(4, 1) NOT NULL,
    humidite_creneau INTEGER NOT NULL,
    vitesse_vent_kmh NUMERIC(4, 1) NOT NULL,
    pluie_prevue_mm NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    pluie_probabilite_pct INTEGER NOT NULL DEFAULT 0,
    aptitude_vent TEXT NOT NULL CHECK (aptitude_vent IN ('optimale', 'limite', 'trop_fort_interdit')),
    aptitude_lessivage TEXT NOT NULL CHECK (aptitude_lessivage IN ('sec_optimal', 'risque_moyen', 'lessivage_imminent_interdit')),
    aptitude_temperature TEXT NOT NULL CHECK (aptitude_temperature IN ('optimale', 'trop_frais', 'trop_chaud_brulure_interdit')),
    score_aptitude_global INTEGER NOT NULL CHECK (score_aptitude_global BETWEEN 0 AND 100),
    statut_fenetre TEXT NOT NULL CHECK (statut_fenetre IN ('optimale', 'favorable', 'delicate', 'interdite')),
    justification_technique TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_agrometeo_pred_plot ON public.agrometeo_14d_predictions(plot_id, date_calcul DESC);
CREATE INDEX IF NOT EXISTS idx_agrometeo_daily_pred_id ON public.agrometeo_daily_disease_risk(prediction_id, jour_horizon);
CREATE INDEX IF NOT EXISTS idx_agrometeo_windows_pred_id ON public.agrometeo_intervention_windows(prediction_id, date_jour);

-- RLS
ALTER TABLE public.agrometeo_disease_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agrometeo_14d_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agrometeo_daily_disease_risk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agrometeo_intervention_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Disease parameters read for authenticated"
    ON public.agrometeo_disease_parameters FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Users can manage agrometeo predictions for own plots"
    ON public.agrometeo_14d_predictions FOR ALL
    TO authenticated
    USING (plot_id IN (SELECT p.id FROM public.plots p JOIN public.farms f ON p.farm_id = f.id WHERE f.user_id = auth.uid()))
    WITH CHECK (plot_id IN (SELECT p.id FROM public.plots p JOIN public.farms f ON p.farm_id = f.id WHERE f.user_id = auth.uid()));

CREATE POLICY "Users can manage daily risk for own plots"
    ON public.agrometeo_daily_disease_risk FOR ALL
    TO authenticated
    USING (plot_id IN (SELECT p.id FROM public.plots p JOIN public.farms f ON p.farm_id = f.id WHERE f.user_id = auth.uid()))
    WITH CHECK (plot_id IN (SELECT p.id FROM public.plots p JOIN public.farms f ON p.farm_id = f.id WHERE f.user_id = auth.uid()));

CREATE POLICY "Users can manage intervention windows for own plots"
    ON public.agrometeo_intervention_windows FOR ALL
    TO authenticated
    USING (plot_id IN (SELECT p.id FROM public.plots p JOIN public.farms f ON p.farm_id = f.id WHERE f.user_id = auth.uid()))
    WITH CHECK (plot_id IN (SELECT p.id FROM public.plots p JOIN public.farms f ON p.farm_id = f.id WHERE f.user_id = auth.uid()));

-- ==============================================================================
-- INDEX DE SCALABILITÉ & HAUTE CHARGE (10k à 1M utilisateurs)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_id ON public.subscriptions(provider_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_farms_region ON public.farms(region);
CREATE INDEX IF NOT EXISTS idx_plots_culture ON public.plots(culture);


