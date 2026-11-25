-- Persistent public media used by approved professional community posts.
-- Uploads are restricted to the verified professional's own storage folder.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'community-content',
    'community-content',
    true,
    104857600,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view community content media" ON storage.objects;
CREATE POLICY "Public can view community content media"
    ON storage.objects FOR SELECT TO anon, authenticated
    USING (bucket_id = 'community-content');

DROP POLICY IF EXISTS "Verified professionals can upload their own community media" ON storage.objects;
CREATE POLICY "Verified professionals can upload their own community media"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'community-content'
        AND (storage.foldername(name))[1] = auth.uid()::text
        AND public.is_verified_professional(auth.uid())
    );

DROP POLICY IF EXISTS "Verified professionals can update their own community media" ON storage.objects;
CREATE POLICY "Verified professionals can update their own community media"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'community-content'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'community-content'
        AND (storage.foldername(name))[1] = auth.uid()::text
        AND public.is_verified_professional(auth.uid())
    );

DROP POLICY IF EXISTS "Verified professionals can delete their own community media" ON storage.objects;
CREATE POLICY "Verified professionals can delete their own community media"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'community-content'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
