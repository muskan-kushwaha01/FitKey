-- Private credential storage for professional onboarding. Files remain private and
-- are only accessible to the authenticated professional who owns the folder.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'professional-documents',
    'professional-documents',
    false,
    10485760,
    ARRAY['application/pdf', 'image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Professionals can view their own credential documents" ON storage.objects;
CREATE POLICY "Professionals can view their own credential documents"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'professional-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Professionals can upload their own credential documents" ON storage.objects;
CREATE POLICY "Professionals can upload their own credential documents"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'professional-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
        AND EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Professionals can delete their own credential documents" ON storage.objects;
CREATE POLICY "Professionals can delete their own credential documents"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'professional-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
