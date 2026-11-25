-- Corrective community RPCs and user/professional leaderboard separation.
-- RLS remains enabled; the functions are scoped to auth.uid() and approved posts.

CREATE OR REPLACE FUNCTION public.toggle_community_post_like(p_post_id uuid, p_like boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_likes_count integer;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required to react to posts.' USING ERRCODE = '42501'; END IF;
    IF p_post_id IS NULL OR p_like IS NULL THEN RAISE EXCEPTION 'A post and like action are required.' USING ERRCODE = '22023'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = p_post_id AND p.approval_status = 'approved' AND p.is_published = true) THEN
        RAISE EXCEPTION 'This post is not available for reactions.' USING ERRCODE = '22023';
    END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_post_id::text));
    IF p_like THEN
        INSERT INTO public.community_post_likes (post_id, user_id) VALUES (p_post_id, v_uid)
        ON CONFLICT (post_id, user_id) DO NOTHING;
    ELSE
        DELETE FROM public.community_post_likes WHERE post_id = p_post_id AND user_id = v_uid;
    END IF;
    SELECT p.likes_count INTO v_likes_count FROM public.community_posts p WHERE p.id = p_post_id;
    RETURN pg_catalog.jsonb_build_object('success', true, 'liked', p_like, 'likes_count', COALESCE(v_likes_count, 0));
END;
$$;
REVOKE ALL ON FUNCTION public.toggle_community_post_like(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_community_post_like(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_community_post_comments(p_post_id uuid)
RETURNS TABLE (id uuid, post_id uuid, user_id uuid, author_name text, body text, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required to read comments.' USING ERRCODE = '42501'; END IF;
    RETURN QUERY
    SELECT c.id, c.post_id, c.user_id, c.author_name, c.body, c.created_at, c.updated_at
    FROM public.community_post_comments c JOIN public.community_posts p ON p.id = c.post_id
    WHERE c.post_id = p_post_id AND p.approval_status = 'approved' AND p.is_published = true
    ORDER BY c.created_at ASC;
END;
$$;
REVOKE ALL ON FUNCTION public.get_community_post_comments(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_community_post_comments(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_community_post_comment(p_post_id uuid, p_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_comment public.community_post_comments%ROWTYPE;
    v_comments_count integer;
    v_author_name text;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required to comment.' USING ERRCODE = '42501'; END IF;
    IF p_post_id IS NULL OR pg_catalog.char_length(pg_catalog.btrim(COALESCE(p_body, ''))) NOT BETWEEN 1 AND 2000 THEN
        RAISE EXCEPTION 'Comment must contain between 1 and 2000 characters.' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = p_post_id AND p.approval_status = 'approved' AND p.is_published = true) THEN
        RAISE EXCEPTION 'Comments are available on approved and published posts.' USING ERRCODE = '22023';
    END IF;
    SELECT NULLIF(pg_catalog.btrim(pr.full_name), '') INTO v_author_name
    FROM public.profiles pr WHERE pr.id = v_uid;
    INSERT INTO public.community_post_comments (post_id, user_id, author_name, body)
    VALUES (p_post_id, v_uid, COALESCE(v_author_name, 'FitKey Member'), pg_catalog.btrim(p_body))
    RETURNING * INTO v_comment;
    SELECT p.comments_count INTO v_comments_count FROM public.community_posts p WHERE p.id = p_post_id;
    RETURN pg_catalog.jsonb_build_object('success', true, 'comment', pg_catalog.to_jsonb(v_comment), 'comments_count', COALESCE(v_comments_count, 0));
END;
$$;
REVOKE ALL ON FUNCTION public.create_community_post_comment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_community_post_comment(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_community_post_comment(p_comment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_post_id uuid;
    v_comments_count integer;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required to delete a comment.' USING ERRCODE = '42501'; END IF;
    DELETE FROM public.community_post_comments c WHERE c.id = p_comment_id AND c.user_id = v_uid RETURNING c.post_id INTO v_post_id;
    IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('success', false, 'error', 'Comment not found or not owned by you.'); END IF;
    SELECT p.comments_count INTO v_comments_count FROM public.community_posts p WHERE p.id = v_post_id;
    RETURN pg_catalog.jsonb_build_object('success', true, 'comments_count', COALESCE(v_comments_count, 0));
END;
$$;
REVOKE ALL ON FUNCTION public.delete_community_post_comment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_community_post_comment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text, available_xp bigint, rank bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    WITH balances AS (
        SELECT p.id, COALESCE(NULLIF(pg_catalog.btrim(p.full_name), ''), 'FitKey Member') AS full_name,
               NULLIF(pg_catalog.btrim(p.avatar_url), '') AS avatar,
               GREATEST(COALESCE(SUM(CASE pg_catalog.upper(xt.type) WHEN 'EARN' THEN xt.amount WHEN 'SPEND' THEN -xt.amount ELSE 0 END), 0), 0)::bigint AS xp
        FROM public.profiles p LEFT JOIN public.xp_transactions xt ON xt.user_id = p.id
        WHERE COALESCE(pg_catalog.lower(p.account_type), 'user') = 'user'
          AND COALESCE(p.leaderboard_visibility, true) = true
          AND NOT EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.user_id = p.id)
        GROUP BY p.id, p.full_name, p.avatar_url
    ), ranked AS (
        SELECT b.*, pg_catalog.row_number() OVER (ORDER BY b.xp DESC, b.full_name ASC, b.id ASC) AS board_rank FROM balances b
    )
    SELECT r.id, r.full_name, r.avatar, r.xp, r.board_rank FROM ranked r
    WHERE r.board_rank <= GREATEST(1, LEAST(COALESCE(p_limit, 50), 100)) OR r.id = auth.uid()
    ORDER BY r.board_rank;
$$;
REVOKE ALL ON FUNCTION public.get_user_leaderboard(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_leaderboard(integer) TO authenticated;
