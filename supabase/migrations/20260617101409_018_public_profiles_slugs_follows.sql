-- Add username to profiles (unique, auto-generated from full_name)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS followers_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (username);

-- Back-fill username from full_name (lowercase, hyphenated, dedup with numeric suffix)
DO $$
DECLARE
  rec RECORD;
  base_slug text;
  candidate text;
  counter int;
BEGIN
  FOR rec IN SELECT id, full_name FROM public.profiles WHERE username IS NULL LOOP
    -- Build base: lowercase, replace spaces with hyphens, strip non-alphanumeric-hyphen
    base_slug := lower(regexp_replace(coalesce(rec.full_name, 'user'), '[^a-z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN base_slug := 'user'; END IF;

    candidate := base_slug;
    counter := 1;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate AND id <> rec.id) LOOP
      candidate := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;

    UPDATE public.profiles SET username = candidate WHERE id = rec.id;
  END LOOP;
END $$;

-- Trigger to auto-set username on new profiles if not provided
CREATE OR REPLACE FUNCTION public.generate_username()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  base_slug text;
  candidate text;
  counter int;
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    base_slug := lower(regexp_replace(coalesce(NEW.full_name, 'user'), '[^a-z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN base_slug := 'user'; END IF;
    candidate := base_slug;
    counter := 1;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate AND id <> NEW.id) LOOP
      candidate := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    NEW.username := candidate;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generate_username ON public.profiles;
CREATE TRIGGER trg_generate_username
  BEFORE INSERT OR UPDATE OF full_name ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_username();

-- Add slug to posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS share_count integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_unique ON public.posts (slug);

-- Back-fill slug for existing posts
DO $$
DECLARE
  rec RECORD;
  base_slug text;
  candidate text;
  counter int;
BEGIN
  FOR rec IN SELECT id, title, content FROM public.posts WHERE slug IS NULL LOOP
    base_slug := lower(regexp_replace(
      coalesce(nullif(trim(rec.title), ''), left(coalesce(rec.content, 'post'), 50), 'post'),
      '[^a-z0-9]+', '-', 'g'
    ));
    base_slug := trim(both '-' from base_slug);
    base_slug := left(base_slug, 60);
    IF base_slug = '' THEN base_slug := 'post'; END IF;

    candidate := base_slug || '-' || left(replace(rec.id::text, '-', ''), 8);
    -- Slugs include ID suffix so they're inherently unique
    UPDATE public.posts SET slug = candidate WHERE id = rec.id;
  END LOOP;
END $$;

-- Trigger to auto-set slug on new posts
CREATE OR REPLACE FUNCTION public.generate_post_slug()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  base_slug text;
  candidate text;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := lower(regexp_replace(
      coalesce(nullif(trim(NEW.title), ''), left(coalesce(NEW.content, 'post'), 50), 'post'),
      '[^a-z0-9]+', '-', 'g'
    ));
    base_slug := trim(both '-' from base_slug);
    base_slug := left(base_slug, 60);
    IF base_slug = '' THEN base_slug := 'post'; END IF;
    candidate := base_slug || '-' || left(replace(NEW.id::text, '-', ''), 8);
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generate_post_slug ON public.posts;
CREATE TRIGGER trg_generate_post_slug
  BEFORE INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.generate_post_slug();

-- Add slug to communities
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS communities_slug_unique ON public.communities (slug);

-- Back-fill community slugs
DO $$
DECLARE
  rec RECORD;
  base_slug text;
  candidate text;
  counter int;
BEGIN
  FOR rec IN SELECT id, name FROM public.communities WHERE slug IS NULL LOOP
    base_slug := lower(regexp_replace(coalesce(rec.name, 'community'), '[^a-z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN base_slug := 'community'; END IF;
    candidate := base_slug;
    counter := 1;
    WHILE EXISTS (SELECT 1 FROM public.communities WHERE slug = candidate AND id <> rec.id) LOOP
      candidate := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    UPDATE public.communities SET slug = candidate WHERE id = rec.id;
  END LOOP;
END $$;

-- Trigger for community slugs
CREATE OR REPLACE FUNCTION public.generate_community_slug()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  base_slug text;
  candidate text;
  counter int;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := lower(regexp_replace(coalesce(NEW.name, 'community'), '[^a-z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN base_slug := 'community'; END IF;
    candidate := base_slug;
    counter := 1;
    WHILE EXISTS (SELECT 1 FROM public.communities WHERE slug = candidate AND id <> NEW.id) LOOP
      candidate := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generate_community_slug ON public.communities;
CREATE TRIGGER trg_generate_community_slug
  BEFORE INSERT ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.generate_community_slug();

-- user_follows table
CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS user_follows_following_id_idx ON public.user_follows (following_id);
CREATE INDEX IF NOT EXISTS user_follows_follower_id_idx ON public.user_follows (follower_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_public" ON public.user_follows FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "follows_insert_own" ON public.user_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_own" ON public.user_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- Triggers to keep followers_count / following_count in sync
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE public.profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_update_follow_counts ON public.user_follows;
CREATE TRIGGER trg_update_follow_counts
  AFTER INSERT OR DELETE ON public.user_follows
  FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();
