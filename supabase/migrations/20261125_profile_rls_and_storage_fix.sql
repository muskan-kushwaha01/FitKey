-- =============================================================================
-- FitKey – Profile RLS + Storage Quick-Fix
-- Fixes:
--   1. 403 Forbidden on POST /rest/v1/profiles   → adds missing UPDATE RLS policy
--   2. 400 Bad Request on POST /storage/v1/object → creates avatars bucket + RLS
-- Safe to run even if the full 20261125_user_profile_persistence.sql was already applied.
-- All statements are idempotent (IF NOT EXISTS / ON CONFLICT).
-- =============================================================================

-- ─── 1. PROFILES table: ensure RLS is on + add missing UPDATE policy ──────────

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT their own row (may already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'profiles'
      AND policyname  = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile"
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- Allow authenticated users to INSERT their own row (may already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'profiles'
      AND policyname  = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
      ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- ★ This is the policy that was missing and causing the 403 ★
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'profiles'
      AND policyname  = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING  (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Grant table-level permissions (safe no-op if already granted)
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT ALL                     ON TABLE public.profiles TO service_role;

-- Extend profiles with new columns needed by the profile page (safe no-op if already added)
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS full_name            TEXT,
  ADD COLUMN IF NOT EXISTS phone                TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url           TEXT,
  ADD COLUMN IF NOT EXISTS account_type         TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS health_data_sharing  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS leaderboard_visibility BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ DEFAULT now();


-- ─── 2. HEALTH_PROFILES table: ensure RLS is on + add missing UPDATE policy ───

ALTER TABLE IF EXISTS public.health_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'health_profiles'
      AND policyname  = 'Users can view their own health profile'
  ) THEN
    CREATE POLICY "Users can view their own health profile"
      ON public.health_profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'health_profiles'
      AND policyname  = 'Users can insert their own health profile'
  ) THEN
    CREATE POLICY "Users can insert their own health profile"
      ON public.health_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'health_profiles'
      AND policyname  = 'Users can update their own health profile'
  ) THEN
    CREATE POLICY "Users can update their own health profile"
      ON public.health_profiles
      FOR UPDATE
      TO authenticated
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON TABLE public.health_profiles TO authenticated;
GRANT ALL                     ON TABLE public.health_profiles TO service_role;

-- Extend health_profiles with profile-page columns (safe no-op if already present)
ALTER TABLE IF EXISTS public.health_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth      DATE,
  ADD COLUMN IF NOT EXISTS age                INTEGER,
  ADD COLUMN IF NOT EXISTS gender             TEXT,
  ADD COLUMN IF NOT EXISTS height_cm          NUMERIC,
  ADD COLUMN IF NOT EXISTS weight_kg          NUMERIC,
  ADD COLUMN IF NOT EXISTS blood_group        TEXT,
  ADD COLUMN IF NOT EXISTS activity_level     TEXT,
  ADD COLUMN IF NOT EXISTS dietary_preference TEXT,
  ADD COLUMN IF NOT EXISTS wellness_goals     TEXT[],
  ADD COLUMN IF NOT EXISTS primary_goal       TEXT,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ DEFAULT now();


-- ─── 3. AVATARS Storage bucket + per-user RLS ─────────────────────────────────
-- (the 400 error means the bucket does not exist yet)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read (profile photo visible to everyone)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Owner-only upload
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner-only update (overwrite)
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING  (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Owner-only delete
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
