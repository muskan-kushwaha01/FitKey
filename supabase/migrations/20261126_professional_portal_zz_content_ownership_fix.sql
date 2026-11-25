-- Correct professional content ownership access while keeping moderation intact.
-- Verified professionals may submit pending content.
-- Approval status, author identity, curated flags and counters remain server managed.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.community_posts TO authenticated;

DROP POLICY IF EXISTS "Professional accounts can create pending community posts" ON public.community_posts;
CREATE POLICY "Verified professionals can create pending community posts"
    ON public.community_posts FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND author_id = auth.uid()
        AND is_curated = false
        AND approval_status = 'pending'
        AND likes_count = 0
        AND comments_count = 0
        AND public.is_verified_professional(auth.uid())
    );

DROP POLICY IF EXISTS "Professional accounts can update their own post content" ON public.community_posts;
CREATE POLICY "Verified professionals can update their own post content"
    ON public.community_posts FOR UPDATE TO authenticated
    USING (auth.uid() IS NOT NULL AND author_id = auth.uid() AND is_curated = false)
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND author_id = auth.uid()
        AND is_curated = false
        AND public.is_verified_professional(auth.uid())
    );
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



