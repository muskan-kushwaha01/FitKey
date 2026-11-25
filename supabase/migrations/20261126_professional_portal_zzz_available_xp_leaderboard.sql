-- Rank professionals using their remaining XP balance, while retaining the existing
-- review, rating, and published-content weighting and verified-only visibility.
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
                GREATEST(0, COALESCE(x.lifetime_xp, 0) - COALESCE(x.spent_xp, 0)) * 0.4 +
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
            ROW_NUMBER() OVER (ORDER BY score DESC, GREATEST(0, lifetime_xp - spent_xp) DESC, professional_id ASC) AS rank
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
            ROUND((GREATEST(0, COALESCE(x.lifetime_xp,0) - COALESCE(x.spent_xp,0))*0.4 + COALESCE(r.avg_rating,0)*60.0 +
                COALESCE(r.review_count,0)*3.0 + COALESCE(c.post_count,0)*4.5)::numeric) AS score
        FROM public.professional_profiles pp
        LEFT JOIN xp_totals x ON x.professional_id = pp.user_id
        LEFT JOIN review_stats r ON r.professional_id = pp.user_id
        LEFT JOIN post_counts c ON c.professional_id = pp.user_id
        WHERE lower(btrim(COALESCE(pp.verification_status,''))) IN ('verified','verified practitioner','approved')
    ),
    with_rank AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY score DESC, GREATEST(0, lifetime_xp - spent_xp) DESC, professional_id ASC) AS rank
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

