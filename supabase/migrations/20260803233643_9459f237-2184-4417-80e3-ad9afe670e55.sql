CREATE POLICY "avatars own read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_permission(auth.uid(), 'members.manage')));

CREATE POLICY "avatars own insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_permission(auth.uid(), 'members.manage')));

CREATE POLICY "avatars own update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_permission(auth.uid(), 'members.manage')));

CREATE POLICY "avatars own delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_permission(auth.uid(), 'members.manage')));