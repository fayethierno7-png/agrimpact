-- ==========================================================
-- AGRIMPACT : Migration Paramètres & Avatars
-- ==========================================================

-- 1. Créer le type enum pour le thème si nécessaire
DO $$ BEGIN
    CREATE TYPE public.app_theme AS ENUM ('light', 'dark', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Ajouter avatar_url et theme à la table profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS theme public.app_theme NOT NULL DEFAULT 'system';

-- 3. Création du bucket Supabase Storage "avatars"
-- Note : public = true permet l'accès en lecture directe sans token d'accès signé
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5 MB max
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 4. Politiques de sécurité RLS sur storage.objects

-- Lecture publique pour tous (accès direct aux URLs des avatars)
DROP POLICY IF EXISTS "Avatars Public Read" ON storage.objects;
CREATE POLICY "Avatars Public Read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Insertion / Upload réservé au propriétaire basé sur son user_id
DROP POLICY IF EXISTS "Avatars Owner Insert" ON storage.objects;
CREATE POLICY "Avatars Owner Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR name LIKE (auth.uid()::text || '-%')
    )
);

-- Mise à jour réservée au propriétaire
DROP POLICY IF EXISTS "Avatars Owner Update" ON storage.objects;
CREATE POLICY "Avatars Owner Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR name LIKE (auth.uid()::text || '-%')
    )
);

-- Suppression réservée au propriétaire
DROP POLICY IF EXISTS "Avatars Owner Delete" ON storage.objects;
CREATE POLICY "Avatars Owner Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR name LIKE (auth.uid()::text || '-%')
    )
);
