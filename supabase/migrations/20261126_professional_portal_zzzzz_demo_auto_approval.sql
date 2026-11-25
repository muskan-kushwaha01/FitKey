-- Demo publishing mode: content from verified professionals is approved on save.
-- Doctor verification, author ownership, curated-content and engagement protections remain enforced.

ALTER TABLE public.community_posts
    ALTER COLUMN approval_status SET DEFAULT 'approved';

DROP POLICY IF EXISTS "Verified professionals can create pending community posts" ON public.community_posts;
DROP POLICY IF EXISTS "Verified professionals can create approved community posts" ON public.community_posts;
CREATE POLICY "Verified professionals can create approved community posts"
    ON public.community_posts FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND author_id = auth.uid()
        AND is_curated = false
        AND approval_status = 'approved'
        AND is_published = true
        AND likes_count = 0
        AND comments_count = 0
        AND public.is_verified_professional(auth.uid())
    );

DROP POLICY IF EXISTS "Verified professionals can update their own post content" ON public.community_posts;
CREATE POLICY "Verified professionals can update their own post content"
    ON public.community_posts FOR UPDATE TO authenticated
    USING (auth.uid() IS NOT NULL AND author_id = auth.uid() AND is_curated = false)
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND author_id = auth.uid()
        AND is_curated = false
        AND approval_status = 'approved'
        AND is_published = true
        AND public.is_verified_professional(auth.uid())
    );
-- Promote existing pending content owned by verified professionals for the demo.
UPDATE public.community_posts cp
SET approval_status = 'approved', is_published = true, updated_at = now()
WHERE cp.is_curated = false
  AND cp.author_id IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.user_id = cp.author_id
        AND lower(btrim(coalesce(pp.verification_status, ''))) IN ('verified', 'verified practitioner', 'approved')
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
            NEW.approval_status := 'approved';
            NEW.is_published := true;
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
REVOKE ALL ON FUNCTION public.is_verified_professional(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_verified_professional(uuid) TO authenticated;

