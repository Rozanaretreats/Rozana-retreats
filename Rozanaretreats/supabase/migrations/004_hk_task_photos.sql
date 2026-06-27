-- HK photo proof (Module 3 — before + after required to mark done)

ALTER TABLE housekeeping_tasks
  ADD COLUMN IF NOT EXISTS photo_before_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_after_url TEXT;

-- Storage bucket for room photos (Supabase Dashboard → Storage also works)
INSERT INTO storage.buckets (id, name, public)
VALUES ('hk-photos', 'hk-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_hk_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "anon_hk_photos_select" ON storage.objects;

CREATE POLICY "anon_hk_photos_insert" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'hk-photos');

CREATE POLICY "anon_hk_photos_select" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'hk-photos');
