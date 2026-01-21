-- Create attachments bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (user can only access own folder)
CREATE POLICY attachments_read_own ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY attachments_insert_own ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY attachments_update_own ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY attachments_delete_own ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

