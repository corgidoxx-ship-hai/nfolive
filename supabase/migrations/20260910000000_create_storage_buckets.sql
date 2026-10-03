-- Storage buckets the app uploads to. On Lovable Cloud these were created by the
-- platform, so the original migrations never created them. Both stay private:
-- the server hands out signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('media', 'media', false, 10485760, ARRAY['image/*', 'audio/*']),
  ('slips', 'slips', false, 10485760, ARRAY['image/*'])
ON CONFLICT (id) DO NOTHING;
