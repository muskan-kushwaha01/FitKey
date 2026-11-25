-- ==============================================================================
-- FitKey Database Migration: Community Screen Persistence
-- Description: Creates Supabase tables, triggers, RLS policies, safe public
--              practitioner lookup RPC, and curated starter feed content for
--              the Community screen.
--              NOTE: Bookmark / save persistence (community_post_saves /
--              saves_count) is intentionally omitted for a later phase.
-- Date: 2026-11-25
-- ==============================================================================

-- ==============================================================================
-- 1. Verification Helper Function
--    Checks public.professional_profiles.verification_status rather than mere
--    row existence so Pending Verification professionals cannot publish posts.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_verified_professional(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT CASE
        WHEN p_user_id IS NULL THEN false
        ELSE EXISTS (
            SELECT 1
            FROM public.professional_profiles p
            WHERE p.user_id = p_user_id
              AND lower(btrim(coalesce(p.verification_status, ''))) IN (
                  'verified',
                  'verified practitioner',
                  'approved'
              )
        )
    END;
$$;

REVOKE ALL ON FUNCTION public.is_verified_professional(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_verified_professional(uuid) TO authenticated;


-- ==============================================================================
-- 2. `public.community_posts`
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.community_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    external_author_key text,
    is_curated boolean NOT NULL DEFAULT false,
    author_name text NOT NULL,
    author_specialty text,
    author_photo text,
    author_verification_status text NOT NULL DEFAULT 'Verified Practitioner',
    content_type text NOT NULL CHECK (content_type IN ('article', 'reel', 'discussion')),
    title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 300),
    category text NOT NULL CHECK (char_length(btrim(category)) BETWEEN 1 AND 120),
    tags text[] NOT NULL DEFAULT '{}'::text[],
    summary text,
    body text NOT NULL DEFAULT '',
    media_url text,
    media_type text,
    thumbnail_url text,
    duration_label text,
    read_time_minutes integer NOT NULL DEFAULT 1 CHECK (read_time_minutes >= 1),
    approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    is_published boolean NOT NULL DEFAULT true,
    likes_count integer NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
    comments_count integer NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT community_posts_author_or_curated CHECK (is_curated = true OR author_id IS NOT NULL),
    CONSTRAINT community_posts_external_key_unique UNIQUE (external_author_key)
);

CREATE INDEX IF NOT EXISTS idx_community_posts_feed
    ON public.community_posts (approval_status, is_published, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_type_feed
    ON public.community_posts (content_type, approval_status, is_published, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_author
    ON public.community_posts (author_id, created_at DESC);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.community_posts FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.community_posts TO authenticated;
GRANT ALL ON TABLE public.community_posts TO service_role;

-- Policies on community_posts (idempotent drop/recreate)
DROP POLICY IF EXISTS "Authenticated users can view approved community posts" ON public.community_posts;
CREATE POLICY "Authenticated users can view approved community posts"
    ON public.community_posts
    FOR SELECT
    TO authenticated
    USING (
        (approval_status = 'approved' AND is_published = true)
        OR author_id = auth.uid()
    );

DROP POLICY IF EXISTS "Verified professionals can create pending community posts" ON public.community_posts;
CREATE POLICY "Verified professionals can create pending community posts"
    ON public.community_posts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND author_id = auth.uid()
        AND is_curated = false
        AND approval_status = 'pending'
        AND likes_count = 0
        AND comments_count = 0
        AND public.is_verified_professional(auth.uid())
    );

DROP POLICY IF EXISTS "Verified professionals can update their own post content" ON public.community_posts;
CREATE POLICY "Verified professionals can update their own post content"
    ON public.community_posts
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND author_id = auth.uid()
        AND is_curated = false
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND author_id = auth.uid()
        AND is_curated = false
        AND public.is_verified_professional(auth.uid())
    );

DROP POLICY IF EXISTS "Verified professionals can delete their own posts" ON public.community_posts;
CREATE POLICY "Verified professionals can delete their own posts"
    ON public.community_posts
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND author_id = auth.uid()
        AND is_curated = false
    );


-- Helper: resolve authenticated author's non-PII display snapshot cleanly for trigger use
CREATE OR REPLACE FUNCTION public.get_community_author_snapshot()
RETURNS TABLE (
    full_name text,
    avatar_url text,
    specialization text,
    verification_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_name text;
    v_avatar text;
    v_spec text;
    v_verif text;
BEGIN
    IF v_uid IS NULL THEN
        RETURN;
    END IF;

    SELECT
        NULLIF(btrim(pr.full_name), ''),
        NULLIF(btrim(pr.avatar_url), '')
    INTO v_name, v_avatar
    FROM public.profiles pr
    WHERE pr.id = v_uid;

    IF v_name IS NULL THEN
        SELECT NULLIF(btrim(u.raw_user_meta_data->>'full_name'), '')
        INTO v_name
        FROM auth.users u
        WHERE u.id = v_uid;
    END IF;

    SELECT
        NULLIF(btrim(pp.specialization), ''),
        NULLIF(btrim(pp.verification_status), '')
    INTO v_spec, v_verif
    FROM public.professional_profiles pp
    WHERE pp.user_id = v_uid;

    full_name := coalesce(v_name, 'Verified Practitioner');
    avatar_url := v_avatar;
    specialization := coalesce(v_spec, 'Clinical Wellness');
    verification_status := coalesce(v_verif, 'Verified Practitioner');
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.get_community_author_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_community_author_snapshot() TO authenticated;


-- Trigger: protect moderation/counter fields and populate verified author snapshot.
-- Runs as SECURITY INVOKER so CURRENT_USER reflects PostgreSQL's real, un-spoofable
-- effective execution role rather than a masked SECURITY DEFINER owner or client JWT claim.
CREATE OR REPLACE FUNCTION public.community_posts_guard_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_is_privileged boolean := (
        CURRENT_USER IN ('postgres', 'supabase_admin', 'service_role')
        OR EXISTS (
            SELECT 1
            FROM pg_catalog.pg_roles r
            WHERE r.rolname = CURRENT_USER
              AND (r.rolsuper OR r.rolbypassrls)
        )
    );
    v_is_counter_sync boolean := (
        v_is_privileged
        AND pg_catalog.pg_trigger_depth() > 1
        AND pg_catalog.current_setting('app.syncing_community_counter', true) = 'on'
    );
BEGIN
    IF TG_OP = 'UPDATE' AND v_is_counter_sync THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'INSERT' THEN
        IF NOT v_is_privileged THEN
            IF v_uid IS NULL OR NOT public.is_verified_professional(v_uid) THEN
                RAISE EXCEPTION 'Only verified professionals can create community posts'
                    USING ERRCODE = '42501';
            END IF;

            -- Enforce trusted server-owned identity & initial moderation/counters
            NEW.author_id := v_uid;
            NEW.is_curated := false;
            NEW.external_author_key := NULL;
            NEW.approval_status := 'pending';
            NEW.likes_count := 0;
            NEW.comments_count := 0;
            NEW.created_at := now();
            NEW.updated_at := now();

            -- Derive non-PII author snapshot directly from profiles + professional_profiles
            SELECT
                s.full_name,
                s.avatar_url,
                s.specialization,
                s.verification_status
            INTO
                NEW.author_name,
                NEW.author_photo,
                NEW.author_specialty,
                NEW.author_verification_status
            FROM public.get_community_author_snapshot() s;

            NEW.author_name := coalesce(NEW.author_name, 'Verified Practitioner');
            NEW.author_specialty := coalesce(NEW.author_specialty, 'Clinical Wellness');
            NEW.author_verification_status := coalesce(NEW.author_verification_status, 'Verified Practitioner');
        ELSE
            NEW.updated_at := now();
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NOT v_is_privileged THEN
            IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
                RAISE EXCEPTION 'Cannot reassign post author_id' USING ERRCODE = '42501';
            END IF;
            IF NEW.is_curated IS DISTINCT FROM OLD.is_curated
               OR NEW.external_author_key IS DISTINCT FROM OLD.external_author_key THEN
                RAISE EXCEPTION 'Cannot modify curated flags' USING ERRCODE = '42501';
            END IF;
            IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
                RAISE EXCEPTION 'Authors cannot approve or change approval_status of their own posts'
                    USING ERRCODE = '42501';
            END IF;
            IF NEW.likes_count IS DISTINCT FROM OLD.likes_count
               OR NEW.comments_count IS DISTINCT FROM OLD.comments_count THEN
                RAISE EXCEPTION 'Engagement counters cannot be modified directly by clients'
                    USING ERRCODE = '42501';
            END IF;
            IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
                RAISE EXCEPTION 'Cannot modify post creation timestamp' USING ERRCODE = '42501';
            END IF;

            -- Substantive edits to already-approved posts require fresh moderation
            IF OLD.approval_status = 'approved'
               AND (
                   NEW.content_type IS DISTINCT FROM OLD.content_type
                   OR NEW.title IS DISTINCT FROM OLD.title
                   OR NEW.category IS DISTINCT FROM OLD.category
                   OR NEW.tags IS DISTINCT FROM OLD.tags
                   OR NEW.summary IS DISTINCT FROM OLD.summary
                   OR NEW.body IS DISTINCT FROM OLD.body
                   OR NEW.media_url IS DISTINCT FROM OLD.media_url
                   OR NEW.media_type IS DISTINCT FROM OLD.media_type
                   OR NEW.thumbnail_url IS DISTINCT FROM OLD.thumbnail_url
                   OR NEW.duration_label IS DISTINCT FROM OLD.duration_label
                   OR NEW.read_time_minutes IS DISTINCT FROM OLD.read_time_minutes
               ) THEN
                NEW.approval_status := 'pending';
            END IF;

            -- Preserve trusted server-managed author fields unless admin updates them
            NEW.author_name := OLD.author_name;
            NEW.author_specialty := OLD.author_specialty;
            NEW.author_photo := OLD.author_photo;
            NEW.author_verification_status := OLD.author_verification_status;
        END IF;

        NEW.updated_at := now();
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_posts_guard ON public.community_posts;
CREATE TRIGGER trg_community_posts_guard
    BEFORE INSERT OR UPDATE ON public.community_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.community_posts_guard_trigger();


-- ==============================================================================
-- 3. `public.community_post_likes`
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.community_post_likes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT community_post_likes_unique UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_post_likes_user
    ON public.community_post_likes (user_id, post_id);

CREATE INDEX IF NOT EXISTS idx_community_post_likes_post
    ON public.community_post_likes (post_id);

ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.community_post_likes FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.community_post_likes TO authenticated;
GRANT ALL ON TABLE public.community_post_likes TO service_role;

DROP POLICY IF EXISTS "Users can read their own post likes" ON public.community_post_likes;
CREATE POLICY "Users can read their own post likes"
    ON public.community_post_likes
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can like approved community posts" ON public.community_post_likes;
CREATE POLICY "Users can like approved community posts"
    ON public.community_post_likes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.community_posts p
            WHERE p.id = post_id
              AND p.approval_status = 'approved'
              AND p.is_published = true
        )
    );

DROP POLICY IF EXISTS "Users can unlike their own post likes" ON public.community_post_likes;
CREATE POLICY "Users can unlike their own post likes"
    ON public.community_post_likes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Enforce authenticated liker identity & sync likes_count automatically
CREATE OR REPLACE FUNCTION public.community_post_likes_identity_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        NEW.user_id := auth.uid();
    END IF;
    NEW.created_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_post_likes_identity ON public.community_post_likes;
CREATE TRIGGER trg_community_post_likes_identity
    BEFORE INSERT ON public.community_post_likes
    FOR EACH ROW
    EXECUTE FUNCTION public.community_post_likes_identity_trigger();

CREATE OR REPLACE FUNCTION public.sync_community_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_post_id uuid := COALESCE(NEW.post_id, OLD.post_id);
BEGIN
    PERFORM pg_catalog.set_config('app.syncing_community_counter', 'on', true);

    UPDATE public.community_posts
    SET likes_count = GREATEST(
        0,
        (SELECT count(*)::integer FROM public.community_post_likes WHERE post_id = v_post_id)
    )
    WHERE id = v_post_id;

    PERFORM pg_catalog.set_config('app.syncing_community_counter', 'off', true);

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_community_post_likes_count ON public.community_post_likes;
CREATE TRIGGER trg_sync_community_post_likes_count
    AFTER INSERT OR DELETE ON public.community_post_likes
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_community_post_likes_count();


-- ==============================================================================
-- 4. `public.community_post_comments`
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.community_post_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name text NOT NULL DEFAULT 'FitKey Member',
    body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_post_comments_post_created
    ON public.community_post_comments (post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_community_post_comments_user
    ON public.community_post_comments (user_id);

ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.community_post_comments FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.community_post_comments TO authenticated;
GRANT ALL ON TABLE public.community_post_comments TO service_role;

DROP POLICY IF EXISTS "Authenticated users can read comments on approved posts" ON public.community_post_comments;
CREATE POLICY "Authenticated users can read comments on approved posts"
    ON public.community_post_comments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.community_posts p
            WHERE p.id = post_id
              AND (
                  (p.approval_status = 'approved' AND p.is_published = true)
                  OR p.author_id = auth.uid()
              )
        )
    );

DROP POLICY IF EXISTS "Authenticated users can comment on approved posts" ON public.community_post_comments;
CREATE POLICY "Authenticated users can comment on approved posts"
    ON public.community_post_comments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.community_posts p
            WHERE p.id = post_id
              AND p.approval_status = 'approved'
              AND p.is_published = true
        )
    );

DROP POLICY IF EXISTS "Users can update their own comments" ON public.community_post_comments;
CREATE POLICY "Users can update their own comments"
    ON public.community_post_comments
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.community_post_comments;
CREATE POLICY "Users can delete their own comments"
    ON public.community_post_comments
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Helper: resolve authenticated commenter's non-PII full name for trigger use
CREATE OR REPLACE FUNCTION public.get_community_commenter_name()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_name text;
BEGIN
    IF v_uid IS NULL THEN
        RETURN 'FitKey Member';
    END IF;

    SELECT NULLIF(btrim(pr.full_name), '')
    INTO v_name
    FROM public.profiles pr
    WHERE pr.id = v_uid;

    IF v_name IS NULL THEN
        SELECT NULLIF(btrim(u.raw_user_meta_data->>'full_name'), '')
        INTO v_name
        FROM auth.users u
        WHERE u.id = v_uid;
    END IF;

    RETURN coalesce(v_name, 'FitKey Member');
END;
$$;

REVOKE ALL ON FUNCTION public.get_community_commenter_name() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_community_commenter_name() TO authenticated;


-- Trigger: enforce authenticated commenter identity and resolve non-PII author_name.
-- Runs as SECURITY INVOKER so CURRENT_USER reflects PostgreSQL's real effective execution role.
CREATE OR REPLACE FUNCTION public.community_post_comments_guard_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_is_privileged boolean := (
        CURRENT_USER IN ('postgres', 'supabase_admin', 'service_role')
        OR EXISTS (
            SELECT 1
            FROM pg_catalog.pg_roles r
            WHERE r.rolname = CURRENT_USER
              AND (r.rolsuper OR r.rolbypassrls)
        )
    );
    v_full_name text;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NOT v_is_privileged THEN
            IF v_uid IS NULL THEN
                RAISE EXCEPTION 'Authentication required to comment' USING ERRCODE = '42501';
            END IF;
            NEW.user_id := v_uid;
            NEW.author_name := public.get_community_commenter_name();
        ELSE
            IF NULLIF(btrim(NEW.author_name), '') IS NULL AND NEW.user_id IS NOT NULL THEN
                SELECT NULLIF(btrim(pr.full_name), '')
                INTO v_full_name
                FROM public.profiles pr
                WHERE pr.id = NEW.user_id;
                NEW.author_name := coalesce(v_full_name, 'FitKey Member');
            ELSE
                NEW.author_name := coalesce(NULLIF(btrim(NEW.author_name), ''), 'FitKey Member');
            END IF;
        END IF;

        NEW.body := btrim(NEW.body);
        NEW.created_at := now();
        NEW.updated_at := now();
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NOT v_is_privileged THEN
            IF NEW.post_id IS DISTINCT FROM OLD.post_id
               OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
                RAISE EXCEPTION 'Cannot reassign comment ownership or target post'
                    USING ERRCODE = '42501';
            END IF;
            NEW.author_name := OLD.author_name;
            NEW.created_at := OLD.created_at;
        END IF;
        NEW.body := btrim(NEW.body);
        NEW.updated_at := now();
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_post_comments_guard ON public.community_post_comments;
CREATE TRIGGER trg_community_post_comments_guard
    BEFORE INSERT OR UPDATE ON public.community_post_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.community_post_comments_guard_trigger();

CREATE OR REPLACE FUNCTION public.sync_community_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_post_id uuid := COALESCE(NEW.post_id, OLD.post_id);
BEGIN
    PERFORM pg_catalog.set_config('app.syncing_community_counter', 'on', true);

    UPDATE public.community_posts
    SET comments_count = GREATEST(
        0,
        (SELECT count(*)::integer FROM public.community_post_comments WHERE post_id = v_post_id)
    )
    WHERE id = v_post_id;

    PERFORM pg_catalog.set_config('app.syncing_community_counter', 'off', true);

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_community_post_comments_count ON public.community_post_comments;
CREATE TRIGGER trg_sync_community_post_comments_count
    AFTER INSERT OR DELETE ON public.community_post_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_community_post_comments_count();


-- ==============================================================================
-- 5. Safe Public Professional Summary RPC
--    Allows viewing a verified practitioner's public profile header from a
--    community post without loosening RLS on `public.profiles` or exposing PII
--    (email, phone, or private registration identifiers).
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_public_professional_summary(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    IF p_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT jsonb_build_object(
        'user_id', pp.user_id,
        'full_name', COALESCE(NULLIF(btrim(pr.full_name), ''), 'Verified Practitioner'),
        'avatar_url', NULLIF(btrim(pr.avatar_url), ''),
        'specialization', COALESCE(NULLIF(btrim(pp.specialization), ''), 'Clinical Wellness'),
        'experience_years', pp.experience_years,
        'bio', pp.bio,
        'verification_status', COALESCE(NULLIF(btrim(pp.verification_status), ''), 'Pending Verification'),
        'is_verified', public.is_verified_professional(pp.user_id),
        'consultation_fee', pp.consultation_fee,
        'created_at', pp.created_at
    )
    INTO v_result
    FROM public.professional_profiles pp
    LEFT JOIN public.profiles pr ON pr.id = pp.user_id
    WHERE pp.user_id = p_user_id
      AND (
          public.is_verified_professional(pp.user_id)
          OR pp.user_id = auth.uid()
      )
    LIMIT 1;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_professional_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_professional_summary(uuid) TO authenticated;


-- ==============================================================================
-- 6. Idempotent Curated Starter Clinical Content
--    Platform-curated educational posts so every Community tab has immediate
--    verified wellness guidance without fabricating local professional accounts.
-- ==============================================================================
INSERT INTO public.community_posts (
    author_id,
    external_author_key,
    is_curated,
    author_name,
    author_specialty,
    author_photo,
    author_verification_status,
    content_type,
    title,
    category,
    tags,
    summary,
    body,
    media_url,
    media_type,
    thumbnail_url,
    duration_label,
    read_time_minutes,
    approval_status,
    is_published,
    likes_count,
    comments_count
)
VALUES
(
    NULL,
    'curated_post_001',
    true,
    'FitKey Clinical Editorial Board',
    'Preventive Cardiology & Lifestyle Medicine',
    NULL,
    'Verified Practitioner',
    'article',
    'Heart Rate Variability & Longevity: Why Zone 2 Cardio Beats High-Intensity Burnout',
    'Preventive Health',
    ARRAY['Cardiology', 'HRV', 'Zone 2', 'Longevity'],
    'Sustained aerobic base training strengthens mitochondrial density and improves autonomic recovery far more reliably than daily all-out workouts.',
    E'Many enthusiastic exercisers fall into the trap of training too hard on easy days and not resting enough on recovery days.\n\nZone 2 aerobic movement—generally an effort where you can hold a full conversation in short sentences—builds mitochondrial efficiency, improves insulin sensitivity, and supports long-term cardiovascular resilience without spiking cortisol.\n\nStart with two to three 25-to-40 minute sessions per week alongside daily walking breaks, and track morning recovery trends before adding high-intensity intervals.\n\nEducational note: This guide is for general wellness education and does not replace individualized evaluation from your physician.',
    NULL,
    NULL,
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80',
    NULL,
    5,
    'approved',
    true,
    0,
    0
),
(
    NULL,
    'curated_post_002',
    true,
    'FitKey Rehab & Mobility Team',
    'Orthopedic Physiotherapy & Ergonomics',
    NULL,
    'Verified Practitioner',
    'reel',
    '60-Second Thoracic & Hip Mobility Reset for Desk Workers',
    'Fitness & Mobility',
    ARRAY['Mobility', 'Posture', 'Desk Reset', 'Spine Health'],
    'Break up prolonged sitting stiffness with three gentle scapular, thoracic, and hip-flexor movements right beside your desk.',
    E'Prolonged sitting encourages rounded shoulders, stiff upper backs, and tight hip flexors.\n\nTry this three-move hourly reset:\n1. Open-book thoracic rotations (5 slow reps per side)\n2. Standing scapular wall slides or shoulder rolls (10 reps)\n3. Supported hip-flexor lunge stretch (20 seconds per side)\n\nPair this reset with short 2-minute walking breaks to keep circulation active throughout the workday. Stop immediately if any movement triggers sharp pain or numbness.',
    NULL,
    'video',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
    '0:58',
    2,
    'approved',
    true,
    0,
    0
),
(
    NULL,
    'curated_post_003',
    true,
    'FitKey Sports Medicine Panel',
    'Musculoskeletal Health & Recovery',
    NULL,
    'Verified Practitioner',
    'discussion',
    'Managing Persistent Shoulder Soreness Without Stopping Upper-Body Training',
    'Rehabilitation',
    ARRAY['Shoulder Care', 'Rehab', 'Strength', 'Joint Health'],
    'Open Q&A on adjusting pressing angles, prioritizing scapular stability, and recognizing warning signs that warrant in-person clinical assessment.',
    E'Overhead athletes and desk workers frequently ask whether mild front-of-shoulder soreness means stopping all resistance exercise.\n\nIn many non-acute overuse cases, modifying painful overhead ranges temporarily while emphasizing horizontal pulling, external rotation strengthening, and tempo control allows tissues to adapt safely.\n\nHowever, night pain, sudden weakness, tingling down the arm, or pain after trauma should always be evaluated in person by a qualified clinician before continuing resistance work.\n\nWhat adjustments or questions do you have around keeping joints comfortable during strength training?',
    NULL,
    NULL,
    NULL,
    NULL,
    3,
    'approved',
    true,
    0,
    0
)
ON CONFLICT (external_author_key) DO NOTHING;
