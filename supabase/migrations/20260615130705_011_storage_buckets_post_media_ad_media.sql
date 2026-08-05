-- post-media bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media', 'post-media', true,
  10485760,
  ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ad-media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ad-media', 'ad-media', true,
  10485760,
  ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- post-media policies (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'post_media_public_read'
  ) THEN
    CREATE POLICY "post_media_public_read" ON storage.objects FOR SELECT TO anon, authenticated
      USING (bucket_id = 'post-media');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'post_media_auth_insert'
  ) THEN
    CREATE POLICY "post_media_auth_insert" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'post_media_auth_delete'
  ) THEN
    CREATE POLICY "post_media_auth_delete" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- ad-media policies (admin/authenticated write, public read)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'ad_media_public_read'
  ) THEN
    CREATE POLICY "ad_media_public_read" ON storage.objects FOR SELECT TO anon, authenticated
      USING (bucket_id = 'ad-media');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'ad_media_admin_insert'
  ) THEN
    CREATE POLICY "ad_media_admin_insert" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'ad-media' AND (
          SELECT is_admin FROM public.profiles WHERE id = auth.uid()
        ) = true
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'ad_media_admin_delete'
  ) THEN
    CREATE POLICY "ad_media_admin_delete" ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'ad-media' AND (
          SELECT is_admin FROM public.profiles WHERE id = auth.uid()
        ) = true
      );
  END IF;
END $$;
