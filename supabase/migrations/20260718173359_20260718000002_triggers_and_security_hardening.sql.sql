/*
# SalaamCircle — Triggers & Security Hardening

## What this migration does
Creates all database triggers and their backing functions, then hardens the
trigger functions against privilege escalation and search-path injection attacks.

## Triggers created (9 total)
1. post_likes_count        — keeps posts.like_count in sync with post_likes rows
2. post_saves_count        — keeps posts.save_count in sync with post_saves rows
3. post_comments_count     — keeps posts.comment_count in sync with comments rows
4. community_members_count — keeps communities.member_count in sync with community_members
5. community_posts_count   — keeps communities.post_count in sync with posts
6. trg_update_follow_counts — keeps profiles.followers_count/following_count in sync with user_follows
7. trg_update_conversation_on_message — updates conversation last_message + unread counts on insert
8. trg_generate_username   — auto-generates unique username on profile insert/update
9. trg_generate_post_slug  — auto-generates unique slug on post insert
10. trg_generate_community_slug — auto-generates unique slug on community insert

## Security hardening
- ALL trigger functions use SECURITY DEFINER with SET search_path = pg_catalog, public
  (prevents search-path injection where a malicious schema shadows pg_catalog functions).
- ALL trigger functions have EXECUTE revoked from PUBLIC, anon, and authenticated roles.
  This ensures the functions can ONLY be called by internal triggers, never via
  PostgREST/RPC by unauthenticated or authenticated users.
- The conversation-update function also uses SECURITY DEFINER so it can update the
  conversation row even though the inserting user doesn't have direct UPDATE access
  beyond the participant check.

## Important notes
- All CREATE OR REPLACE FUNCTION statements are idempotent.
- Triggers use DROP IF EXISTS before CREATE so re-running is safe.
*/

-- ============================================================
-- COUNTER TRIGGERS (posts, communities)
-- ============================================================

-- post_likes -> posts.like_count
CREATE OR REPLACE FUNCTION public.update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS post_likes_count ON post_likes;
CREATE TRIGGER post_likes_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_like_count();

-- post_saves -> posts.save_count
CREATE OR REPLACE FUNCTION public.update_post_save_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET save_count = save_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET save_count = GREATEST(save_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS post_saves_count ON post_saves;
CREATE TRIGGER post_saves_count
  AFTER INSERT OR DELETE ON post_saves
  FOR EACH ROW EXECUTE FUNCTION public.update_post_save_count();

-- comments -> posts.comment_count
CREATE OR REPLACE FUNCTION public.update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS post_comments_count ON comments;
CREATE TRIGGER post_comments_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comment_count();

-- community_members -> communities.member_count
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS community_members_count ON community_members;
CREATE TRIGGER community_members_count
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();

-- posts -> communities.post_count
CREATE OR REPLACE FUNCTION public.update_community_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.community_id IS NOT NULL THEN
    UPDATE communities SET post_count = post_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' AND OLD.community_id IS NOT NULL THEN
    UPDATE communities SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS community_posts_count ON posts;
CREATE TRIGGER community_posts_count
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION public.update_community_post_count();

-- ============================================================
-- FOLLOW COUNTS TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_update_follow_counts ON user_follows;
CREATE TRIGGER trg_update_follow_counts
  AFTER INSERT OR DELETE ON user_follows
  FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

-- ============================================================
-- CONVERSATION UPDATE ON MESSAGE INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_update_conversation_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_is_a BOOLEAN;
BEGIN
  SELECT (participant_a_id = NEW.sender_id) INTO v_is_a
  FROM conversations WHERE id = NEW.conversation_id;

  IF v_is_a THEN
    UPDATE conversations
    SET last_message    = NEW.content,
        last_message_at = NOW(),
        unread_count_b  = unread_count_b + 1
    WHERE id = NEW.conversation_id;
  ELSE
    UPDATE conversations
    SET last_message    = NEW.content,
        last_message_at = NOW(),
        unread_count_a  = unread_count_a + 1
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_conversation_on_message ON messages;
CREATE TRIGGER trg_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_conversation_on_message();

-- ============================================================
-- USERNAME AUTO-GENERATION (profiles)
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_username()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
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
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = candidate AND id <> NEW.id) LOOP
      candidate := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    NEW.username := candidate;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generate_username ON profiles;
CREATE TRIGGER trg_generate_username
  BEFORE INSERT OR UPDATE OF full_name ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_username();

-- ============================================================
-- POST SLUG AUTO-GENERATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_post_slug()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
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

DROP TRIGGER IF EXISTS trg_generate_post_slug ON posts;
CREATE TRIGGER trg_generate_post_slug
  BEFORE INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION public.generate_post_slug();

-- ============================================================
-- COMMUNITY SLUG AUTO-GENERATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_community_slug()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
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
    WHILE EXISTS (SELECT 1 FROM communities WHERE slug = candidate AND id <> NEW.id) LOOP
      candidate := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generate_community_slug ON communities;
CREATE TRIGGER trg_generate_community_slug
  BEFORE INSERT ON communities
  FOR EACH ROW EXECUTE FUNCTION public.generate_community_slug();

-- ============================================================
-- SECURITY: Revoke EXECUTE from all roles on all trigger functions.
-- Trigger functions must NEVER be callable via PostgREST/RPC.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.update_post_like_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_post_save_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_post_comment_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_community_member_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_community_post_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_follow_counts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_update_conversation_on_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_username() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_post_slug() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_community_slug() FROM PUBLIC, anon, authenticated;
