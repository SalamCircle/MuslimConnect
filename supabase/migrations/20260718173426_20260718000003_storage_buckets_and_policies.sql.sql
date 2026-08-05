/*
# SalaamCircle — Storage Buckets & Policies

## What this migration does
Creates two public storage buckets for user-uploaded media and their RLS policies.

## Buckets created
1. post-media — for images attached to posts and comments
   - Public: true (readable by anyone, including anon)
   - Max file size: 10 MB
   - Allowed MIME types: jpeg, jpg, png, gif, webp
   - Write: authenticated users, files stored under their own uid folder
   - Delete: authenticated users, only their own files

2. ad-media — for advertisement creative images
   - Public: true (readable by anyone, including anon)
   - Max file size: 10 MB
   - Allowed MIME types: jpeg, jpg, png, gif, webp
   - Write: admin users only (checked via profiles.is_admin)
   - Delete: admin users only

## Security
- Storage RLS policies enforce:
  - Public read on both buckets (anon + authenticated can SELECT)
  - Owner-scoped writes on post-media (folder must match auth.uid())
  - Admin-only writes on ad-media (profile.is_admin = true)
- Policies are idempotent (check existence before creating).

## Important notes
- Bucket creation uses ON CONFLICT DO NOTHING so re-running is safe.
- Policy creation uses DO $$ blocks with existence checks to avoid duplicate policy errors.
*/

-- ============================================================
-- post-media bucket
-- ============================================================
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

-- ============================================================
-- post-media storage policies
-- ============================================================
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
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'post_media_auth_update'
  ) THEN
    CREATE POLICY "post_media_auth_update" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text)
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

-- ============================================================
-- ad-media storage policies (admin-only write, public read)
-- ============================================================
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
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'ad_media_admin_update'
  ) THEN
    CREATE POLICY "ad_media_admin_update" ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = 'ad-media' AND (
          SELECT is_admin FROM public.profiles WHERE id = auth.uid()
        ) = true
      )
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
