-- Storage bucket for blog images
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read
CREATE POLICY "Public read blog images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

-- Allow anon upload (admin uses anon key with passcode guard in frontend)
CREATE POLICY "Anon upload blog images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'blog-images');

CREATE POLICY "Anon update blog images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'blog-images');

CREATE POLICY "Anon delete blog images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'blog-images');
