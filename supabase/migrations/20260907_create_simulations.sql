-- ==========================================================
-- AGRIMPACT : Table des simulations utilisateur & AHA Moment
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    region TEXT NOT NULL,
    culture TEXT NOT NULL,
    surface_ha NUMERIC(6, 2) DEFAULT 1.0,
    type_irrigation TEXT DEFAULT 'goutte-a-goutte',
    stade_nom TEXT,
    result_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour accélérer les requêtes d'historique par utilisateur
CREATE INDEX IF NOT EXISTS idx_simulations_user_id ON public.simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_simulations_created_at ON public.simulations(created_at DESC);

-- Activation de la Row Level Security (RLS)
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

-- Politique de consultation : chaque utilisateur consulte uniquement ses simulations
CREATE POLICY "Les utilisateurs peuvent voir leurs simulations" 
ON public.simulations FOR SELECT 
USING (auth.uid() = user_id);

-- Politique d'insertion : chaque utilisateur insère ses simulations
CREATE POLICY "Les utilisateurs peuvent insérer leurs simulations" 
ON public.simulations FOR INSERT 
WITH CHECK (auth.uid() = user_id);
