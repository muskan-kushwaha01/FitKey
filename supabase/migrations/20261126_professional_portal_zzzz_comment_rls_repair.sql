-- Restore the intended authenticated comment permissions without exposing comments
-- on content that is still pending moderation or unpublished.

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
              AND ((p.approval_status = 'approved' AND p.is_published = true)
                   OR p.author_id = auth.uid())
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
