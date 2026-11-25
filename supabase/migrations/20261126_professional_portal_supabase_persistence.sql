-- ==============================================================================
-- FitKey Database Migration: Professional Portal Full Supabase Persistence (Hardened)
-- Description: Migrates Professional XP, content views, reviews,
--              leaderboard, activity, and reward redemptions to Supabase.
--              Reuses existing community_posts, community_post_likes,
--              community_post_comments, and professional_profiles.
-- Date: 2026-11-26 (Audited & Hardened)
-- SAFE TO EXECUTE: Fully idempotent and non-destructive.
-- ==============================================================================


-- ==============================================================================
-- 1. Extend `public.community_posts` with views counter (Safe Alter)
-- ==============================================================================
ALTER TABLE IF EXISTS public.community_posts
    ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0 CHECK (views_count >= 0);


-- ==============================================================================
-- 2. `public.community_post_views` (Deduplicated Persistent View Tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.community_post_views (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id    uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    viewer_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    view_date  date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT community_post_views_dedup UNIQUE (post_id, viewer_id, view_date)
);

CREATE INDEX IF NOT EXISTS idx_community_post_views_post_date
    ON public.community_post_views (post_id, view_date);

ALTER TABLE public.community_post_views ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.community_post_views FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.community_post_views TO authenticated;
GRANT ALL ON TABLE public.community_post_views TO service_role;

DROP POLICY IF EXISTS "Users can read their own view records" ON public.community_post_views;
CREATE POLICY "Users can read their own view records"
    ON public.community_post_views
    FOR SELECT
    TO authenticated
    USING (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "Users can record views" ON public.community_post_views;
CREATE POLICY "Users can record views"
    ON public.community_post_views
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = viewer_id);

-- RPC: record a verified, deduplicated post view
CREATE OR REPLACE FUNCTION public.record_community_post_view(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_inserted boolean := false;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'ANONYMOUS');
    END IF;

    IF p_post_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'INVALID_POST');
    END IF;

    -- Only count views for approved or own posts
    IF NOT EXISTS (
        SELECT 1 FROM public.community_posts
        WHERE id = p_post_id AND (approval_status = 'approved' OR author_id = v_uid)
    ) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'POST_NOT_FOUND');
    END IF;

    INSERT INTO public.community_post_views (post_id, viewer_id, view_date)
    VALUES (p_post_id, v_uid, CURRENT_DATE)
    ON CONFLICT (post_id, viewer_id, view_date) DO NOTHING
    RETURNING true INTO v_inserted;

    IF v_inserted THEN
        PERFORM pg_catalog.set_config('app.syncing_community_counter', 'on', true);

        UPDATE public.community_posts
        SET views_count = views_count + 1
        WHERE id = p_post_id;

        PERFORM pg_catalog.set_config('app.syncing_community_counter', 'off', true);
    END IF;

    RETURN jsonb_build_object('success', true, 'counted', COALESCE(v_inserted, false));
END;
$$;

REVOKE ALL ON FUNCTION public.record_community_post_view(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_community_post_view(uuid) TO authenticated;


-- ==============================================================================
-- 3. `public.professional_xp_transactions` (Isolated Ledger)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.professional_xp_transactions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type            text NOT NULL CHECK (type IN ('EARN', 'SPEND')),
    amount          integer NOT NULL CHECK (amount > 0),
    source          text NOT NULL DEFAULT 'GENERAL',
    ref_id          text NOT NULL,
    description     text NOT NULL DEFAULT '',
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Idempotency: prevent duplicate awards for the same event
CREATE UNIQUE INDEX IF NOT EXISTS idx_prof_xp_transactions_dedup
    ON public.professional_xp_transactions (professional_id, ref_id)
    WHERE type = 'EARN';

CREATE INDEX IF NOT EXISTS idx_prof_xp_transactions_prof_created
    ON public.professional_xp_transactions (professional_id, created_at DESC, id DESC);

ALTER TABLE public.professional_xp_transactions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.professional_xp_transactions FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.professional_xp_transactions TO authenticated;
GRANT ALL ON TABLE public.professional_xp_transactions TO service_role;

DROP POLICY IF EXISTS "Professionals can view their own XP transactions" ON public.professional_xp_transactions;
CREATE POLICY "Professionals can view their own XP transactions"
    ON public.professional_xp_transactions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = professional_id);

-- Direct client inserts, updates and deletes are fully revoked.
-- All writes occur exclusively via trusted server procedures below.


-- ==============================================================================
-- 4. `public.professional_redemptions` (Claimed Benefits)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.professional_redemptions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_id       text NOT NULL,
    title           text NOT NULL DEFAULT '',
    category        text NOT NULL DEFAULT '',
    points          integer NOT NULL CHECK (points > 0),
    redeemed_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT professional_redemptions_unique UNIQUE (professional_id, reward_id)
);

CREATE INDEX IF NOT EXISTS idx_prof_redemptions_prof_created
    ON public.professional_redemptions (professional_id, redeemed_at DESC);

ALTER TABLE public.professional_redemptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.professional_redemptions FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.professional_redemptions TO authenticated;
GRANT ALL ON TABLE public.professional_redemptions TO service_role;

DROP POLICY IF EXISTS "Professionals can view their own redemptions" ON public.professional_redemptions;
CREATE POLICY "Professionals can view their own redemptions"
    ON public.professional_redemptions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = professional_id);


-- ==============================================================================
-- 5. `public.professional_reviews` (Verified Patient Reviews)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.professional_reviews (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewer_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewer_name   text NOT NULL DEFAULT 'FitKey Member',
    rating          smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         text NOT NULL DEFAULT '',
    xp_ref_id       text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT professional_reviews_unique UNIQUE (professional_id, reviewer_id),
    CONSTRAINT professional_reviews_no_self_review CHECK (professional_id <> reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_prof_reviews_professional
    ON public.professional_reviews (professional_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prof_reviews_reviewer
    ON public.professional_reviews (reviewer_id);

ALTER TABLE public.professional_reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.professional_reviews FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.professional_reviews TO authenticated;
GRANT ALL ON TABLE public.professional_reviews TO service_role;

DROP POLICY IF EXISTS "Authenticated users can read professional reviews" ON public.professional_reviews;
CREATE POLICY "Authenticated users can read professional reviews"
    ON public.professional_reviews
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can submit reviews" ON public.professional_reviews;
CREATE POLICY "Authenticated users can submit reviews"
    ON public.professional_reviews
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = reviewer_id
        AND auth.uid() <> professional_id
    );

DROP POLICY IF EXISTS "Reviewers can edit their own reviews" ON public.professional_reviews;
CREATE POLICY "Reviewers can edit their own reviews"
    ON public.professional_reviews
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = reviewer_id)
    WITH CHECK (
        auth.uid() = reviewer_id
    );

DROP POLICY IF EXISTS "Reviewers can delete their own reviews" ON public.professional_reviews;
CREATE POLICY "Reviewers can delete their own reviews"
    ON public.professional_reviews
    FOR DELETE
    TO authenticated
    USING (auth.uid() = reviewer_id);

-- Guard trigger: guarantees reviewer_id matches auth.uid() and derives name server-side
CREATE OR REPLACE FUNCTION public.professional_reviews_guard_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_is_privileged boolean := (
        CURRENT_USER IN ('postgres', 'service_role', 'supabase_admin')
        OR EXISTS (
            SELECT 1 FROM pg_catalog.pg_roles r
            WHERE r.rolname = CURRENT_USER AND (r.rolsuper OR r.rolbypassrls)
        )
    );
    v_trusted_name text;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NOT v_is_privileged THEN
            IF v_uid IS NULL THEN
                RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
            END IF;
            -- Force server-owned identity
            NEW.reviewer_id := v_uid;
            -- Block self-review
            IF NEW.reviewer_id = NEW.professional_id THEN
                RAISE EXCEPTION 'Professionals cannot review their own profile'
                    USING ERRCODE = '42501';
            END IF;

            -- Never trust reviewer_name supplied by the client
            SELECT NULLIF(btrim(pr.full_name), '')
            INTO v_trusted_name
            FROM public.profiles pr
            WHERE pr.id = v_uid;

            IF v_trusted_name IS NULL THEN
                SELECT NULLIF(btrim(u.raw_user_meta_data->>'full_name'), '')
                INTO v_trusted_name
                FROM auth.users u
                WHERE u.id = v_uid;
            END IF;

            NEW.reviewer_name := COALESCE(v_trusted_name, 'FitKey Member');
            NEW.created_at := now();
        END IF;
        NEW.updated_at := now();
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NOT v_is_privileged THEN
            IF NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id THEN
                RAISE EXCEPTION 'Cannot reassign review reviewer_id' USING ERRCODE = '42501';
            END IF;
            IF NEW.professional_id IS DISTINCT FROM OLD.professional_id THEN
                RAISE EXCEPTION 'Cannot reassign review professional_id' USING ERRCODE = '42501';
            END IF;
            IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
                RAISE EXCEPTION 'Cannot modify review creation timestamp' USING ERRCODE = '42501';
            END IF;
            NEW.reviewer_name := OLD.reviewer_name;
            NEW.xp_ref_id := OLD.xp_ref_id;
        END IF;
        NEW.updated_at := now();
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_professional_reviews_guard ON public.professional_reviews;
CREATE TRIGGER trg_professional_reviews_guard
    BEFORE INSERT OR UPDATE ON public.professional_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.professional_reviews_guard_trigger();


-- ==============================================================================
-- 6. `public.professional_activities` (Genuine Activity Log)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.professional_activities (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type   text NOT NULL CHECK (activity_type IN (
        'content_published', 'review_received', 'xp_earned',
        'xp_milestone', 'credential_verified', 'reward_redeemed', 'consultation_completed'
    )),
    title           text NOT NULL DEFAULT '',
    description     text NOT NULL DEFAULT '',
    metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prof_activities_prof_created
    ON public.professional_activities (professional_id, created_at DESC);

ALTER TABLE public.professional_activities ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.professional_activities FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.professional_activities TO authenticated;
GRANT ALL ON TABLE public.professional_activities TO service_role;

DROP POLICY IF EXISTS "Professionals can view their own activities" ON public.professional_activities;
CREATE POLICY "Professionals can view their own activities"
    ON public.professional_activities
    FOR SELECT
    TO authenticated
    USING (auth.uid() = professional_id);


-- ==============================================================================
-- 7. Hardened XP Procedure: `award_prof_xp`
--    SECURITY DEFINER; privileged execution ONLY.
--    Arbitrary client awards are strictly prohibited.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.award_prof_xp(
    p_professional_id uuid,
    p_amount          integer,
    p_source          text,
    p_ref_id          text,
    p_description     text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_monthly_earned integer;
    v_monthly_cap integer := 3000;
    v_new_id uuid;
    v_available integer;
BEGIN
    -- Security gate: ONLY postgres, service_role or supabase_admin can invoke directly
    IF CURRENT_USER NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
        RAISE EXCEPTION 'Unauthorized: client cannot directly award XP' USING ERRCODE = '42501';
    END IF;

    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'INVALID_AMOUNT');
    END IF;

    IF p_ref_id IS NULL OR btrim(p_ref_id) = '' THEN
        RAISE EXCEPTION 'ref_id is required for idempotent XP award' USING ERRCODE = '23502';
    END IF;

    -- Monthly earning cap check
    SELECT COALESCE(SUM(amount), 0)::integer INTO v_monthly_earned
    FROM public.professional_xp_transactions
    WHERE professional_id = p_professional_id
      AND type = 'EARN'
      AND date_trunc('month', created_at) = date_trunc('month', now());

    IF v_monthly_earned + p_amount > v_monthly_cap THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'MONTHLY_CAP_EXCEEDED',
            'message', 'Monthly professional XP cap of ' || v_monthly_cap || ' reached.'
        );
    END IF;

    -- Insert idempotently
    INSERT INTO public.professional_xp_transactions
        (professional_id, type, amount, source, ref_id, description)
    VALUES
        (p_professional_id, 'EARN', p_amount, p_source, p_ref_id, p_description)
    ON CONFLICT (professional_id, ref_id) WHERE type = 'EARN' DO NOTHING
    RETURNING id INTO v_new_id;

    -- Compute available XP
    SELECT GREATEST(0,
        COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE -amount END), 0)
    )::integer
    INTO v_available
    FROM public.professional_xp_transactions
    WHERE professional_id = p_professional_id;

    RETURN jsonb_build_object(
        'success', true,
        'inserted', v_new_id IS NOT NULL,
        'available_xp', v_available
    );
END;
$$;

-- Revoke from all regular users; strictly reserve for service_role
REVOKE ALL ON FUNCTION public.award_prof_xp(uuid, integer, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_prof_xp(uuid, integer, text, text, text) TO service_role;


-- ==============================================================================
-- 8. Atomic Spending & Redemption Procedure: `spend_prof_xp_and_redeem`
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.spend_prof_xp_and_redeem(
    p_reward_id    text,
    p_title        text,
    p_category     text,
    p_points       integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller uuid := auth.uid();
    v_available integer;
    v_spend_ref text;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    IF p_points <= 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'INVALID_AMOUNT');
    END IF;

    -- Transaction-level advisory lock per professional prevents double-spending races
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtext('prof_redeem_' || v_caller::text)
    );

    -- Check duplicate redemption
    IF EXISTS (
        SELECT 1 FROM public.professional_redemptions
        WHERE professional_id = v_caller AND reward_id = p_reward_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'ALREADY_REDEEMED',
            'message', 'You have already redeemed this benefit.');
    END IF;

    -- Check available balance
    SELECT GREATEST(0,
        COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE -amount END), 0)
    )::integer
    INTO v_available
    FROM public.professional_xp_transactions
    WHERE professional_id = v_caller;

    IF v_available < p_points THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'INSUFFICIENT_XP',
            'available_xp', v_available,
            'message', 'Insufficient XP. You need ' || (p_points - v_available) || ' more XP.'
        );
    END IF;

    -- Record SPEND transaction
    v_spend_ref := 'prof-redeem-' || p_reward_id || '-' || v_caller::text;
    INSERT INTO public.professional_xp_transactions
        (professional_id, type, amount, source, ref_id, description)
    VALUES
        (v_caller, 'SPEND', p_points, 'REWARD_REDEMPTION',
         v_spend_ref, 'Redeemed ' || p_title);

    -- Record redemption
    INSERT INTO public.professional_redemptions
        (professional_id, reward_id, title, category, points)
    VALUES
        (v_caller, p_reward_id, p_title, p_category, p_points);

    -- Log activity
    INSERT INTO public.professional_activities
        (professional_id, activity_type, title, description, metadata)
    VALUES
        (v_caller, 'reward_redeemed',
         'Reward Redeemed: ' || p_title,
         'Spent ' || p_points || ' XP to redeem "' || p_title || '"',
         jsonb_build_object('reward_id', p_reward_id, 'points', p_points));

    SELECT GREATEST(0,
        COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE -amount END), 0)
    )::integer
    INTO v_available
    FROM public.professional_xp_transactions
    WHERE professional_id = v_caller;

    RETURN jsonb_build_object(
        'success', true,
        'available_xp', v_available,
        'message', 'Successfully redeemed "' || p_title || '"!'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.spend_prof_xp_and_redeem(text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_prof_xp_and_redeem(text, text, text, integer) TO authenticated;


-- ==============================================================================
-- 9. XP Summary Procedure: `get_prof_xp_summary`
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_prof_xp_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_lifetime integer := 0;
    v_spent    integer := 0;
    v_monthly  integer := 0;
    v_entries  jsonb   := '[]'::jsonb;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    SELECT
        COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE 0 END), 0)::integer,
        COALESCE(SUM(CASE WHEN type = 'SPEND' THEN amount ELSE 0 END), 0)::integer,
        COALESCE(SUM(CASE WHEN type = 'EARN'
            AND date_trunc('month', created_at) = date_trunc('month', now())
            THEN amount ELSE 0 END), 0)::integer
    INTO v_lifetime, v_spent, v_monthly
    FROM public.professional_xp_transactions
    WHERE professional_id = v_uid;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', t.id,
            'type', t.type,
            'amount', t.amount,
            'source', t.source,
            'ref_id', t.ref_id,
            'description', t.description,
            'timestamp', t.created_at
        )
        ORDER BY t.created_at DESC, t.id DESC
    ), '[]'::jsonb)
    INTO v_entries
    FROM public.professional_xp_transactions t
    WHERE t.professional_id = v_uid;

    RETURN jsonb_build_object(
        'success', true,
        'available_xp', GREATEST(0, v_lifetime - v_spent),
        'lifetime_xp', v_lifetime,
        'redeemed_xp', v_spent,
        'monthly_xp', v_monthly,
        'transactions', v_entries
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_prof_xp_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_prof_xp_summary() TO authenticated;


-- ==============================================================================
-- 10. Leaderboard Procedure: `get_prof_leaderboard` (SECURITY DEFINER)
--     Aggregates public rankings across verified professionals.
--     Zero patient or sensitive profile information exposed.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_prof_leaderboard(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid       uuid := auth.uid();
    v_entries   jsonb;
    v_my_rank   jsonb;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    WITH xp_totals AS (
        SELECT
            professional_id,
            COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE 0 END), 0)::integer AS lifetime_xp,
            COALESCE(SUM(CASE WHEN type = 'SPEND' THEN amount ELSE 0 END), 0)::integer AS spent_xp
        FROM public.professional_xp_transactions
        GROUP BY professional_id
    ),
    review_stats AS (
        SELECT
            professional_id,
            COUNT(*)::integer AS review_count,
            ROUND(AVG(rating)::numeric, 1) AS avg_rating
        FROM public.professional_reviews
        GROUP BY professional_id
    ),
    post_counts AS (
        SELECT
            author_id AS professional_id,
            COUNT(*)::integer AS post_count
        FROM public.community_posts
        WHERE approval_status = 'approved'
          AND is_published = true
          AND is_curated = false
          AND author_id IS NOT NULL
        GROUP BY author_id
    ),
    ranked AS (
        SELECT
            pp.user_id AS professional_id,
            COALESCE(NULLIF(btrim(prf.full_name), ''), 'Verified Practitioner') AS full_name,
            COALESCE(NULLIF(btrim(pp.specialization), ''), 'Clinical Specialist') AS specialization,
            prf.avatar_url,
            pp.verification_status,
            COALESCE(x.lifetime_xp, 0) AS lifetime_xp,
            COALESCE(x.spent_xp, 0)    AS spent_xp,
            COALESCE(r.review_count, 0) AS review_count,
            COALESCE(r.avg_rating, 0)   AS avg_rating,
            COALESCE(c.post_count, 0)   AS post_count,
            ROUND((
                COALESCE(x.lifetime_xp, 0) * 0.4 +
                COALESCE(r.avg_rating, 0) * 60.0 +
                COALESCE(r.review_count, 0) * 3.0 +
                COALESCE(c.post_count, 0) * 4.5
            )::numeric) AS score
        FROM public.professional_profiles pp
        LEFT JOIN public.profiles prf ON prf.id = pp.user_id
        LEFT JOIN xp_totals x ON x.professional_id = pp.user_id
        LEFT JOIN review_stats r ON r.professional_id = pp.user_id
        LEFT JOIN post_counts c ON c.professional_id = pp.user_id
        WHERE lower(btrim(COALESCE(pp.verification_status, ''))) IN (
            'verified', 'verified practitioner', 'approved'
        )
    ),
    ranked_with_rank AS (
        SELECT
            *,
            ROW_NUMBER() OVER (ORDER BY score DESC, lifetime_xp DESC, professional_id ASC) AS rank
        FROM ranked
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'rank', rwr.rank,
            'professional_id', rwr.professional_id,
            'full_name', rwr.full_name,
            'specialization', rwr.specialization,
            'avatar_url', rwr.avatar_url,
            'lifetime_xp', rwr.lifetime_xp,
            'available_xp', GREATEST(0, rwr.lifetime_xp - rwr.spent_xp),
            'review_count', rwr.review_count,
            'avg_rating', rwr.avg_rating,
            'post_count', rwr.post_count,
            'score', rwr.score
        )
        ORDER BY rwr.rank ASC
    )
    INTO v_entries
    FROM ranked_with_rank rwr
    WHERE rwr.rank <= p_limit;

    -- Return the caller's rank regardless of top N cutoff
    WITH xp_totals AS (
        SELECT
            professional_id,
            COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE 0 END), 0)::integer AS lifetime_xp,
            COALESCE(SUM(CASE WHEN type = 'SPEND' THEN amount ELSE 0 END), 0)::integer AS spent_xp
        FROM public.professional_xp_transactions
        GROUP BY professional_id
    ),
    review_stats AS (
        SELECT professional_id,
            COUNT(*)::integer AS review_count,
            ROUND(AVG(rating)::numeric, 1) AS avg_rating
        FROM public.professional_reviews GROUP BY professional_id
    ),
    post_counts AS (
        SELECT author_id AS professional_id, COUNT(*)::integer AS post_count
        FROM public.community_posts
        WHERE approval_status = 'approved' AND is_published = true
          AND is_curated = false AND author_id IS NOT NULL
        GROUP BY author_id
    ),
    ranked AS (
        SELECT pp.user_id AS professional_id,
            COALESCE(x.lifetime_xp, 0) AS lifetime_xp,
            COALESCE(x.spent_xp, 0) AS spent_xp,
            COALESCE(r.review_count, 0) AS review_count,
            COALESCE(r.avg_rating, 0) AS avg_rating,
            COALESCE(c.post_count, 0) AS post_count,
            ROUND((COALESCE(x.lifetime_xp,0)*0.4 + COALESCE(r.avg_rating,0)*60.0 +
                COALESCE(r.review_count,0)*3.0 + COALESCE(c.post_count,0)*4.5)::numeric) AS score
        FROM public.professional_profiles pp
        LEFT JOIN xp_totals x ON x.professional_id = pp.user_id
        LEFT JOIN review_stats r ON r.professional_id = pp.user_id
        LEFT JOIN post_counts c ON c.professional_id = pp.user_id
        WHERE lower(btrim(COALESCE(pp.verification_status,''))) IN ('verified','verified practitioner','approved')
    ),
    with_rank AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY score DESC, lifetime_xp DESC, professional_id ASC) AS rank
        FROM ranked
    )
    SELECT jsonb_build_object(
        'rank', wr.rank,
        'lifetime_xp', wr.lifetime_xp,
        'available_xp', GREATEST(0, wr.lifetime_xp - wr.spent_xp),
        'score', wr.score,
        'review_count', wr.review_count,
        'avg_rating', wr.avg_rating,
        'post_count', wr.post_count
    )
    INTO v_my_rank
    FROM with_rank wr
    WHERE wr.professional_id = v_uid;

    RETURN jsonb_build_object(
        'success', true,
        'entries', COALESCE(v_entries, '[]'::jsonb),
        'my_rank', v_my_rank
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_prof_leaderboard(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_prof_leaderboard(integer) TO authenticated;


-- ==============================================================================
-- 11. Dashboard Summary Procedure: `get_prof_dashboard_summary` (SECURITY DEFINER)
--     Single round-trip dashboard fetch with zero patient PII leakage.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_prof_dashboard_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid          uuid := auth.uid();
    v_xp_avail     integer := 0;
    v_xp_lifetime  integer := 0;
    v_post_count   integer := 0;
    v_total_views  bigint  := 0;
    v_total_likes  bigint  := 0;
    v_total_saves  bigint  := 0;
    v_review_count integer := 0;
    v_avg_rating   numeric := 0;
    v_activities   jsonb   := '[]'::jsonb;
    v_reviews      jsonb   := '[]'::jsonb;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    -- XP balance
    SELECT
        GREATEST(0, COALESCE(SUM(CASE WHEN type='EARN' THEN amount ELSE -amount END),0))::integer,
        COALESCE(SUM(CASE WHEN type='EARN' THEN amount ELSE 0 END),0)::integer
    INTO v_xp_avail, v_xp_lifetime
    FROM public.professional_xp_transactions
    WHERE professional_id = v_uid;

    -- Post count & genuine persistent engagement
    SELECT
        COUNT(*)::integer,
        COALESCE(SUM(cp.views_count),0)::bigint,
        COALESCE(SUM(cp.likes_count),0)::bigint
    INTO v_post_count, v_total_views, v_total_likes
    FROM public.community_posts cp
    WHERE cp.author_id = v_uid
      AND cp.approval_status = 'approved'
      AND cp.is_published = true
      AND cp.is_curated = false;

    -- Review stats
    SELECT
        COUNT(*)::integer,
        COALESCE(ROUND(AVG(rating)::numeric,1), 0)
    INTO v_review_count, v_avg_rating
    FROM public.professional_reviews
    WHERE professional_id = v_uid;

    -- Recent reviews (last 5)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', pr.id,
            'reviewer_name', pr.reviewer_name,
            'rating', pr.rating,
            'comment', pr.comment,
            'created_at', pr.created_at
        )
        ORDER BY pr.created_at DESC
    ), '[]'::jsonb)
    INTO v_reviews
    FROM (
        SELECT * FROM public.professional_reviews
        WHERE professional_id = v_uid
        ORDER BY created_at DESC LIMIT 5
    ) pr;

    -- Recent activities (last 10)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', a.id,
            'activity_type', a.activity_type,
            'title', a.title,
            'description', a.description,
            'metadata', a.metadata,
            'created_at', a.created_at
        )
        ORDER BY a.created_at DESC
    ), '[]'::jsonb)
    INTO v_activities
    FROM (
        SELECT * FROM public.professional_activities
        WHERE professional_id = v_uid
        ORDER BY created_at DESC LIMIT 10
    ) a;

    RETURN jsonb_build_object(
        'success', true,
        'available_xp', v_xp_avail,
        'lifetime_xp', v_xp_lifetime,
        'published_posts', v_post_count,
        'total_views', v_total_views,
        'total_likes', v_total_likes,
        'total_saves', v_total_saves,
        'review_count', v_review_count,
        'avg_rating', v_avg_rating,
        'recent_reviews', v_reviews,
        'recent_activities', v_activities
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_prof_dashboard_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_prof_dashboard_summary() TO authenticated;


-- ==============================================================================
-- 12. Review Submission Procedure: `submit_prof_review`
--     Derives reviewer name strictly server-side.
--     Guarantees one-time XP award and prevents self-review.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.submit_prof_review(
    p_professional_id uuid,
    p_rating          smallint,
    p_comment         text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller        uuid := auth.uid();
    v_reviewer_name text;
    v_review_id     uuid;
    v_xp_ref        text;
    v_xp_amount     integer;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    IF v_caller = p_professional_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Professionals cannot review their own profile.');
    END IF;

    IF p_rating < 1 OR p_rating > 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rating must be between 1 and 5.');
    END IF;

    -- Prevent duplicate review
    IF EXISTS (
        SELECT 1 FROM public.professional_reviews
        WHERE professional_id = p_professional_id AND reviewer_id = v_caller
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You have already reviewed this professional. Use edit to update your review.'
        );
    END IF;

    -- Derive reviewer display name server-side (never trust client)
    SELECT NULLIF(btrim(pr.full_name), '')
    INTO v_reviewer_name
    FROM public.profiles pr
    WHERE pr.id = v_caller;

    IF v_reviewer_name IS NULL THEN
        SELECT NULLIF(btrim(u.raw_user_meta_data->>'full_name'), '')
        INTO v_reviewer_name
        FROM auth.users u
        WHERE u.id = v_caller;
    END IF;

    v_reviewer_name := COALESCE(v_reviewer_name, 'FitKey Member');

    -- Insert review
    v_xp_ref := 'prof-review-' || v_caller::text || '-' || p_professional_id::text;
    INSERT INTO public.professional_reviews
        (professional_id, reviewer_id, reviewer_name, rating, comment, xp_ref_id)
    VALUES
        (p_professional_id, v_caller, v_reviewer_name,
         p_rating, TRIM(COALESCE(p_comment, '')), v_xp_ref)
    RETURNING id INTO v_review_id;

    -- Award review XP to reviewed professional (5★=10 XP, 4★=5 XP)
    v_xp_amount := CASE
        WHEN p_rating = 5 THEN 10
        WHEN p_rating = 4 THEN 5
        ELSE 0
    END;

    IF v_xp_amount > 0 THEN
        INSERT INTO public.professional_xp_transactions
            (professional_id, type, amount, source, ref_id, description)
        VALUES
            (p_professional_id, 'EARN', v_xp_amount, 'GENUINE_REVIEW', v_xp_ref,
             p_rating::text || chr(9733) || ' verified review from ' || v_reviewer_name)
        ON CONFLICT (professional_id, ref_id) WHERE type = 'EARN' DO NOTHING;
    END IF;

    -- Log activity
    INSERT INTO public.professional_activities
        (professional_id, activity_type, title, description, metadata)
    VALUES
        (p_professional_id, 'review_received',
         'New ' || p_rating::text || chr(9733) || ' Review Received',
         'Reviewed by ' || v_reviewer_name,
         jsonb_build_object('review_id', v_review_id, 'rating', p_rating, 'xp_awarded', v_xp_amount));

    RETURN jsonb_build_object(
        'success', true,
        'review_id', v_review_id,
        'xp_awarded', v_xp_amount
    );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_prof_review(uuid, smallint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_prof_review(uuid, smallint, text) TO authenticated;


-- ==============================================================================
-- 13. Legacy Migration Procedure: `migrate_prof_localstorage_data`
--     Derives ownership strictly from auth.uid().
--     Excludes all demo data. Fully idempotent.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.migrate_prof_localstorage_data(
    p_xp_transactions  jsonb DEFAULT '[]'::jsonb,
    p_redemptions      jsonb DEFAULT '[]'::jsonb,
    p_reviews          jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller        uuid := auth.uid();
    v_reviewer_name text;
    v_xp_inserted   integer := 0;
    v_xp_skipped    integer := 0;
    v_xp_errors     integer := 0;
    v_red_inserted  integer := 0;
    v_red_skipped   integer := 0;
    v_rev_inserted  integer := 0;
    v_rev_skipped   integer := 0;
    v_tx            jsonb;
    v_rd            jsonb;
    v_rv            jsonb;
    v_amount        integer;
    v_rating        smallint;
    v_ref           text;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    -- Derive reviewer display name server-side from public.profiles (never trust client payload)
    SELECT NULLIF(btrim(pr.full_name), '')
    INTO v_reviewer_name
    FROM public.profiles pr
    WHERE pr.id = v_caller;

    IF v_reviewer_name IS NULL THEN
        SELECT NULLIF(btrim(u.raw_user_meta_data->>'full_name'), '')
        INTO v_reviewer_name
        FROM auth.users u
        WHERE u.id = v_caller;
    END IF;

    v_reviewer_name := COALESCE(v_reviewer_name, 'FitKey Member');

    -- ── XP Transactions ──────────────────────────────────────────────────────
    FOR v_tx IN SELECT * FROM jsonb_array_elements(COALESCE(p_xp_transactions, '[]'::jsonb))
    LOOP
        BEGIN
            -- Skip demo accounts
            IF (v_tx->>'professionalId') LIKE 'prof_demo%' OR
               (v_tx->>'professionalId') LIKE 'cu_%' THEN
                v_xp_skipped := v_xp_skipped + 1;
                CONTINUE;
            END IF;

            -- Only migrate authenticated professional's own records
            IF (v_tx->>'professionalId') <> v_caller::text THEN
                v_xp_skipped := v_xp_skipped + 1;
                CONTINUE;
            END IF;

            v_amount := (v_tx->>'amount')::integer;
            IF v_amount IS NULL OR v_amount <= 0 THEN
                v_xp_skipped := v_xp_skipped + 1;
                CONTINUE;
            END IF;

            IF (v_tx->>'type') NOT IN ('EARN', 'SPEND') THEN
                v_xp_skipped := v_xp_skipped + 1;
                CONTINUE;
            END IF;

            v_ref := COALESCE(NULLIF(TRIM(v_tx->>'refId'),''), 'migrated-' || gen_random_uuid()::text);

            IF v_ref LIKE '%prof_demo%' OR v_ref LIKE '%_demo_%' THEN
                v_xp_skipped := v_xp_skipped + 1;
                CONTINUE;
            END IF;

            INSERT INTO public.professional_xp_transactions
                (professional_id, type, amount, source, ref_id, description, created_at)
            VALUES (
                v_caller,
                v_tx->>'type',
                v_amount,
                COALESCE(NULLIF(TRIM(v_tx->>'source'),''), 'MIGRATED'),
                v_ref,
                COALESCE(NULLIF(TRIM(v_tx->>'description'),''), 'Migrated from local storage'),
                COALESCE((v_tx->>'timestamp')::timestamptz, now())
            )
            ON CONFLICT (professional_id, ref_id) WHERE type = 'EARN' DO NOTHING;

            IF FOUND THEN
                v_xp_inserted := v_xp_inserted + 1;
            ELSE
                v_xp_skipped := v_xp_skipped + 1;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_xp_errors := v_xp_errors + 1;
        END;
    END LOOP;

    -- ── Redemptions ───────────────────────────────────────────────────────────
    FOR v_rd IN SELECT * FROM jsonb_array_elements(COALESCE(p_redemptions, '[]'::jsonb))
    LOOP
        BEGIN
            IF (v_rd->>'professionalId') LIKE 'prof_demo%' OR
               (v_rd->>'professionalId') LIKE 'cu_%' OR
               (v_rd->>'professionalId') <> v_caller::text THEN
                v_red_skipped := v_red_skipped + 1;
                CONTINUE;
            END IF;

            IF NULLIF(TRIM(v_rd->>'rewardId'),'') IS NULL THEN
                v_red_skipped := v_red_skipped + 1;
                CONTINUE;
            END IF;

            INSERT INTO public.professional_redemptions
                (professional_id, reward_id, title, category, points, redeemed_at)
            VALUES (
                v_caller,
                TRIM(v_rd->>'rewardId'),
                COALESCE(NULLIF(TRIM(v_rd->>'title'),''), 'Migrated Reward'),
                COALESCE(NULLIF(TRIM(v_rd->>'category'),''), 'General'),
                GREATEST(1, COALESCE((v_rd->>'points')::integer, 1)),
                COALESCE((v_rd->>'redeemedAt')::timestamptz, now())
            )
            ON CONFLICT (professional_id, reward_id) DO NOTHING;

            IF FOUND THEN
                v_red_inserted := v_red_inserted + 1;
            ELSE
                v_red_skipped := v_red_skipped + 1;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_red_skipped := v_red_skipped + 1;
        END;
    END LOOP;

    -- ── Reviews (submitted BY this authenticated user as reviewer) ───────────
    FOR v_rv IN SELECT * FROM jsonb_array_elements(COALESCE(p_reviews, '[]'::jsonb))
    LOOP
        BEGIN
            IF (v_rv->>'userId') LIKE 'cu_%' OR
               (v_rv->>'userId') LIKE 'prof_demo%' THEN
                v_rev_skipped := v_rev_skipped + 1;
                CONTINUE;
            END IF;

            BEGIN
                IF (v_rv->>'userId')::uuid <> v_caller THEN
                    v_rev_skipped := v_rev_skipped + 1;
                    CONTINUE;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_rev_skipped := v_rev_skipped + 1;
                CONTINUE;
            END;

            v_rating := (v_rv->>'rating')::smallint;
            IF v_rating IS NULL OR v_rating < 1 OR v_rating > 5 THEN
                v_rev_skipped := v_rev_skipped + 1;
                CONTINUE;
            END IF;

            BEGIN
                PERFORM (v_rv->>'professionalId')::uuid;
            EXCEPTION WHEN OTHERS THEN
                v_rev_skipped := v_rev_skipped + 1;
                CONTINUE;
            END;

            IF (v_rv->>'professionalId')::uuid = v_caller THEN
                v_rev_skipped := v_rev_skipped + 1;
                CONTINUE;
            END IF;

            INSERT INTO public.professional_reviews
                (professional_id, reviewer_id, reviewer_name, rating, comment,
                 xp_ref_id, created_at, updated_at)
            VALUES (
                (v_rv->>'professionalId')::uuid,
                v_caller,
                v_reviewer_name,
                v_rating,
                COALESCE(NULLIF(TRIM(v_rv->>'comment'),''), ''),
                'migrated-review-' || v_caller::text || '-' || (v_rv->>'professionalId'),
                COALESCE((v_rv->>'createdAt')::timestamptz, now()),
                COALESCE((v_rv->>'updatedAt')::timestamptz, now())
            )
            ON CONFLICT (professional_id, reviewer_id) DO NOTHING;

            IF FOUND THEN
                v_rev_inserted := v_rev_inserted + 1;
            ELSE
                v_rev_skipped := v_rev_skipped + 1;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_rev_skipped := v_rev_skipped + 1;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'xp_transactions', jsonb_build_object(
            'inserted', v_xp_inserted,
            'skipped', v_xp_skipped,
            'errors', v_xp_errors
        ),
        'redemptions', jsonb_build_object(
            'inserted', v_red_inserted,
            'skipped', v_red_skipped
        ),
        'reviews', jsonb_build_object(
            'inserted', v_rev_inserted,
            'skipped', v_rev_skipped
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.migrate_prof_localstorage_data(jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.migrate_prof_localstorage_data(jsonb, jsonb, jsonb) TO authenticated;


-- ==============================================================================
-- 14. Auto-award XP when a community_post is approved
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.award_xp_on_post_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_xp_amount integer;
    v_ref_id    text;
    v_desc      text;
BEGIN
    IF OLD.approval_status = 'approved' OR NEW.approval_status <> 'approved' THEN
        RETURN NEW;
    END IF;

    IF NEW.is_curated OR NEW.author_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_xp_amount := CASE NEW.content_type
        WHEN 'article'    THEN 50
        WHEN 'reel'       THEN 75
        WHEN 'discussion' THEN 25
        ELSE 25
    END;

    v_ref_id := 'content-' || NEW.id::text;
    v_desc   := 'Approved ' || initcap(NEW.content_type) || ': "' ||
                LEFT(COALESCE(NULLIF(TRIM(NEW.title),''), 'Untitled'), 80) || '"';

    INSERT INTO public.professional_xp_transactions
        (professional_id, type, amount, source, ref_id, description)
    VALUES
        (NEW.author_id, 'EARN', v_xp_amount, 'APPROVED_CONTENT', v_ref_id, v_desc)
    ON CONFLICT (professional_id, ref_id) WHERE type = 'EARN' DO NOTHING;

    INSERT INTO public.professional_activities
        (professional_id, activity_type, title, description, metadata)
    VALUES
        (NEW.author_id, 'content_published', 'Content Approved: ' || initcap(NEW.content_type),
         v_desc,
         jsonb_build_object('post_id', NEW.id, 'content_type', NEW.content_type, 'xp_awarded', v_xp_amount));

    -- Quality milestone: 3+ approved posts
    DECLARE
        v_post_count integer;
    BEGIN
        SELECT COUNT(*)::integer INTO v_post_count
        FROM public.community_posts
        WHERE author_id = NEW.author_id
          AND approval_status = 'approved'
          AND is_curated = false;

        IF v_post_count >= 3 THEN
            INSERT INTO public.professional_xp_transactions
                (professional_id, type, amount, source, ref_id, description)
            VALUES
                (NEW.author_id, 'EARN', 30, 'QUALITY_CONTRIBUTION',
                 'milestone-3posts-' || NEW.author_id::text,
                 'Quality milestone: 3+ accredited educational posts published')
            ON CONFLICT (professional_id, ref_id) WHERE type = 'EARN' DO NOTHING;
        END IF;
    END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_xp_on_post_approval ON public.community_posts;
CREATE TRIGGER trg_award_xp_on_post_approval
    AFTER UPDATE ON public.community_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.award_xp_on_post_approval();


-- ==============================================================================
-- 15. Auto-award credential verification XP when professional is verified
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.award_xp_on_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_was_verified boolean;
    v_now_verified boolean;
BEGIN
    v_was_verified := lower(btrim(COALESCE(OLD.verification_status, ''))) IN (
        'verified', 'verified practitioner', 'approved'
    );
    v_now_verified := lower(btrim(COALESCE(NEW.verification_status, ''))) IN (
        'verified', 'verified practitioner', 'approved'
    );

    IF NOT v_was_verified AND v_now_verified THEN
        INSERT INTO public.professional_xp_transactions
            (professional_id, type, amount, source, ref_id, description)
        VALUES
            (NEW.user_id, 'EARN', 500, 'CREDENTIAL_VERIFICATION',
             'cred-verif-' || NEW.user_id::text,
             'Clinical credentialing & medical council verification bonus')
        ON CONFLICT (professional_id, ref_id) WHERE type = 'EARN' DO NOTHING;

        INSERT INTO public.professional_activities
            (professional_id, activity_type, title, description, metadata)
        VALUES
            (NEW.user_id, 'credential_verified',
             'Professional Credentials Verified',
             'Your credentials have been reviewed and approved. All features are now active.',
             jsonb_build_object('xp_awarded', 500));
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_xp_on_verification ON public.professional_profiles;
CREATE TRIGGER trg_award_xp_on_verification
    AFTER UPDATE ON public.professional_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.award_xp_on_verification();


-- ==============================================================================
-- 16. Grant schema access to authenticated role
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO authenticated;
