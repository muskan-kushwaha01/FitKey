-- ==============================================================================
-- FitKey Database & Storage Migration: Complete User Profile Persistence
-- Description: Extends `public.profiles` and `public.health_profiles` safely and
--              idempotently, adds server-side protection for system-controlled
--              profile fields (`id`, `account_type`, unverified `email`, timestamps),
--              ensures strict owner-only RLS, and provisions the `avatars` storage
--              bucket + per-user folder policies.
-- Date: 2026-11-25
-- ==============================================================================

-- ==============================================================================
-- 1. Extend `public.profiles` Safely (Preserves All Existing Rows & Policies)
-- ==============================================================================
ALTER TABLE IF EXISTS public.profiles
    ADD COLUMN IF NOT EXISTS full_name TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS health_data_sharing BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS leaderboard_visibility BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

-- Non-destructively ensure strict owner-only policies on `public.profiles`
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd IN ('SELECT', 'ALL')
    ) THEN
        CREATE POLICY "Users can view their own profile"
            ON public.profiles FOR SELECT
            TO authenticated
            USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd IN ('INSERT', 'ALL')
    ) THEN
        CREATE POLICY "Users can insert their own profile"
            ON public.profiles FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd IN ('UPDATE', 'ALL')
    ) THEN
        CREATE POLICY "Users can update their own profile"
            ON public.profiles FOR UPDATE
            TO authenticated
            USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);
    END IF;
END $$;


-- ==============================================================================
-- 2. Protect System-Controlled `public.profiles` Fields & Auth Email Integrity
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_my_auth_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT u.email
    FROM auth.users u
    WHERE u.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_auth_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_auth_email() TO authenticated;


CREATE OR REPLACE FUNCTION public.profiles_guard_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_is_privileged boolean := CURRENT_USER IN ('postgres', 'service_role', 'supabase_admin');
    v_auth_email text;
BEGIN
    IF v_is_privileged THEN
        NEW.updated_at := pg_catalog.now();
        RETURN NEW;
    END IF;

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    v_auth_email := public.get_my_auth_email();

    IF TG_OP = 'INSERT' THEN
        IF NEW.id IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION 'Cannot create profile for another user' USING ERRCODE = '42501';
        END IF;

        -- Prevent client-supplied privilege elevation or unverified email spoofing
        NEW.account_type := 'user';
        NEW.email := COALESCE(NULLIF(pg_catalog.btrim(v_auth_email), ''), NEW.email);
        NEW.created_at := COALESCE(NEW.created_at, pg_catalog.now());
        NEW.updated_at := pg_catalog.now();
        RETURN NEW;
    END IF;

    -- UPDATE protections
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Profile user ID cannot be modified' USING ERRCODE = '42501';
    END IF;

    IF NEW.account_type IS DISTINCT FROM OLD.account_type THEN
        RAISE EXCEPTION 'System-controlled account_type cannot be modified' USING ERRCODE = '42501';
    END IF;

    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        NEW.created_at := OLD.created_at;
    END IF;

    -- Allow profiles.email to update ONLY when syncing to the confirmed auth.users email
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        IF v_auth_email IS NULL OR pg_catalog.lower(pg_catalog.btrim(COALESCE(NEW.email, ''))) <> pg_catalog.lower(pg_catalog.btrim(v_auth_email)) THEN
            RAISE EXCEPTION 'Email must be updated and verified through Supabase Auth' USING ERRCODE = '42501';
        END IF;
        NEW.email := v_auth_email;
    END IF;

    NEW.updated_at := pg_catalog.now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard ON public.profiles;
CREATE TRIGGER trg_profiles_guard
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.profiles_guard_trigger();


-- ==============================================================================
-- 3. Extend `public.health_profiles` & Ensure Owner-Only RLS
-- ==============================================================================
ALTER TABLE IF EXISTS public.health_profiles
    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS age INTEGER,
    ADD COLUMN IF NOT EXISTS gender TEXT,
    ADD COLUMN IF NOT EXISTS height_cm NUMERIC,
    ADD COLUMN IF NOT EXISTS weight_kg NUMERIC,
    ADD COLUMN IF NOT EXISTS blood_group TEXT,
    ADD COLUMN IF NOT EXISTS activity_level TEXT,
    ADD COLUMN IF NOT EXISTS dietary_preference TEXT,
    ADD COLUMN IF NOT EXISTS wellness_goals TEXT[],
    ADD COLUMN IF NOT EXISTS primary_goal TEXT,
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'health_profiles'
          AND (c.conname = 'health_profiles_user_id_key' OR c.contype IN ('p', 'u'))
          AND pg_catalog.pg_get_constraintdef(c.oid) LIKE '%(user_id)%'
    ) THEN
        ALTER TABLE public.health_profiles
            ADD CONSTRAINT health_profiles_user_id_key UNIQUE (user_id);
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_health_profiles_user_id
    ON public.health_profiles(user_id);

ALTER TABLE IF EXISTS public.health_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.health_profiles FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.health_profiles TO authenticated;
GRANT ALL ON TABLE public.health_profiles TO service_role;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'health_profiles' AND cmd IN ('SELECT', 'ALL')
    ) THEN
        CREATE POLICY "Users can view their own health profile"
            ON public.health_profiles FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'health_profiles' AND cmd IN ('INSERT', 'ALL')
    ) THEN
        CREATE POLICY "Users can insert their own health profile"
            ON public.health_profiles FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'health_profiles' AND cmd IN ('UPDATE', 'ALL')
    ) THEN
        CREATE POLICY "Users can update their own health profile"
            ON public.health_profiles FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;


-- ==============================================================================
-- 4. Provision `avatars` Supabase Storage Bucket & Per-User Folder RLS Policies
--    Note: Do NOT alter storage.objects table settings (RLS is pre-enabled by
--    Supabase and owned by supabase_storage_admin).
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    2097152, -- 2 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'avatars');

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

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
