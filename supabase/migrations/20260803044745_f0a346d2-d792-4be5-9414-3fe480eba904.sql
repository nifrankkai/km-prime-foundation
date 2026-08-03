CREATE POLICY "Members upload own support attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Members read own support attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'support-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Support staff read support attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'support-attachments' AND public.has_permission(auth.uid(), 'manage_support_tickets'));