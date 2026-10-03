CREATE POLICY "admins manage media"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'media' AND public.is_admin())
  WITH CHECK (bucket_id = 'media' AND public.is_admin());

CREATE POLICY "anyone uploads slips"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'slips');

CREATE POLICY "admins read slips"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'slips' AND public.is_admin());

CREATE POLICY "admins delete slips"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'slips' AND public.is_admin());