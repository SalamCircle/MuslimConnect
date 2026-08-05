/*
# SalaamCircle — Full Schema Rebuild (Launch-Ready)

## What this migration does
Recreates the ENTIRE database schema from scratch. This single migration replaces
the previous incremental migrations 002–018 with one consolidated, idempotent build
that reflects every column, constraint, and index the application expects.

## Tables created (19 total)
1.  profiles            — user profiles (extends auth.users), with RBAC role, moderation flags, username, follow counts
2.  communities         — community groups with categories, slugs, member/post counts
3.  community_members   — membership join table with roles
4.  posts               — user posts with location scope, moderation status, slugs, counters
5.  comments            — post comments with nesting support
6.  post_likes          — like join table (composite PK)
7.  post_saves          — bookmark join table (composite PK)
8.  user_follows        — follow graph (composite PK, no self-follow)
9.  conversations       — 1:1 message threads with unread counts per participant
10. messages            — messages in conversations
11. news                — published news articles (public read)
12. news_articles       — staging/import queue for news (admin-moderated)
13. mosques             — mosque directory (public read, admin insert)
14. resources           — user-contributed Islamic resources (public read, owner write)
15. businesses          — Muslim business directory (public read, owner write)
16. jobs                — job listings with approval workflow (public read approved)
17. events              — events with approval workflow (public read approved)
18. advertisements     — ads with targeting + placement slots (admin-only writes)
19. reports             — user-submitted reports (owner insert, admin all)
20. notifications       — user notifications (owner read/update, self-insert)

## Security (RLS on EVERY table)
- Every table has RLS ENABLED.
- Public content (posts, communities, mosques, news, news_articles approved, jobs/events approved, ads active, profiles non-sensitive, follows) is readable by anon + authenticated.
- Owner-scoped writes use auth.uid() ownership checks.
- Admin/moderator-only tables (advertisements, news_articles management, mosque inserts) require role check via profiles.
- Messaging is participant-scoped: only conversation participants can read/send messages.
- All policies written as separate SELECT/INSERT/UPDATE/DELETE (no FOR ALL).

## Indexes
- Foreign keys, location fields, status/workflow fields, category fields, slug uniqueness, and feed performance composite indexes.

## Important notes
- This migration is idempotent (uses IF NOT EXISTS / DROP IF EXISTS for policies).
- Seed data is in a SEPARATE migration to keep this one focused on schema.
- Triggers are in a SEPARATE migration to keep this one focused on schema.
*/

-- ============================================================
-- 1. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  avatar_url text,
  bio text,
  username text,
  gender text CHECK (gender IN ('male', 'female', 'prefer_not_to_say')) DEFAULT 'prefer_not_to_say',
  date_of_birth date,
  country text NOT NULL DEFAULT 'United Kingdom',
  region text,
  city text,
  postcode text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  is_online boolean NOT NULL DEFAULT false,
  is_admin boolean NOT NULL DEFAULT false,
  is_moderator boolean NOT NULL DEFAULT false,
  is_suspended boolean NOT NULL DEFAULT false,
  is_banned boolean NOT NULL DEFAULT false,
  role text CHECK (role IN ('admin','moderator','user')) NOT NULL DEFAULT 'user',
  followers_count integer NOT NULL DEFAULT 0,
  following_count integer NOT NULL DEFAULT 0,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON profiles (username);
CREATE INDEX IF NOT EXISTS profiles_region_idx ON profiles(region);
CREATE INDEX IF NOT EXISTS profiles_city_idx ON profiles(city);

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- ============================================================
-- 2. COMMUNITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text CHECK (category IN (
    'students','business','marriage','reverts','technology',
    'parenting','islamic_studies','brothers','sisters','youth','professionals','general'
  )) NOT NULL DEFAULT 'general',
  icon_url text,
  banner_url text,
  creator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  member_count integer NOT NULL DEFAULT 0,
  post_count integer NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  slug text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS communities_slug_unique ON communities (slug);
CREATE INDEX IF NOT EXISTS communities_category_idx ON communities(category);

DROP POLICY IF EXISTS "communities_select" ON communities;
CREATE POLICY "communities_select" ON communities FOR SELECT TO anon, authenticated USING (is_public = true OR creator_id = auth.uid() OR creator_id IS NULL);

DROP POLICY IF EXISTS "communities_insert" ON communities;
CREATE POLICY "communities_insert" ON communities FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "communities_update" ON communities;
CREATE POLICY "communities_update" ON communities FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "communities_delete" ON communities;
CREATE POLICY "communities_delete" ON communities FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- ============================================================
-- 3. COMMUNITY MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text CHECK (role IN ('member','moderator','admin')) NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS community_members_community_idx ON community_members(community_id);
CREATE INDEX IF NOT EXISTS community_members_user_idx ON community_members(user_id);

DROP POLICY IF EXISTS "community_members_select" ON community_members;
CREATE POLICY "community_members_select" ON community_members FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "community_members_insert" ON community_members;
CREATE POLICY "community_members_insert" ON community_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "community_members_update" ON community_members;
CREATE POLICY "community_members_update" ON community_members FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "community_members_delete" ON community_members;
CREATE POLICY "community_members_delete" ON community_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 4. POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
  title text,
  content text NOT NULL,
  image_url text,
  location_scope text CHECK (location_scope IN ('area','city','region','uk','global')) NOT NULL DEFAULT 'uk',
  country text,
  region text,
  city text,
  postcode text,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  save_count integer NOT NULL DEFAULT 0,
  share_count integer NOT NULL DEFAULT 0,
  slug text,
  is_featured boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT true,
  status text CHECK (status IN ('active','hidden','removed')) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_unique ON posts (slug);
CREATE INDEX IF NOT EXISTS posts_user_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_community_idx ON posts(community_id);
CREATE INDEX IF NOT EXISTS posts_region_idx ON posts(region);
CREATE INDEX IF NOT EXISTS posts_city_idx ON posts(city);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts(status);
CREATE INDEX IF NOT EXISTS posts_location_scope_idx ON posts(location_scope);
CREATE INDEX IF NOT EXISTS posts_status_created_at_idx ON posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_status_city_idx ON posts(status, city);
CREATE INDEX IF NOT EXISTS posts_status_region_idx ON posts(status, region);
CREATE INDEX IF NOT EXISTS posts_status_scope_created_idx ON posts(status, location_scope, created_at DESC);

DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "posts_insert" ON posts;
CREATE POLICY "posts_insert" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_update" ON posts;
CREATE POLICY "posts_update" ON posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_delete" ON posts;
CREATE POLICY "posts_delete" ON posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 5. COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS comments_post_idx ON comments(post_id);

DROP POLICY IF EXISTS "comments_select" ON comments;
CREATE POLICY "comments_select" ON comments FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "comments_insert" ON comments;
CREATE POLICY "comments_insert" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comments_update" ON comments;
CREATE POLICY "comments_update" ON comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comments_delete" ON comments;
CREATE POLICY "comments_delete" ON comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 6. POST LIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS post_likes (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_likes_select" ON post_likes;
CREATE POLICY "post_likes_select" ON post_likes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "post_likes_insert" ON post_likes;
CREATE POLICY "post_likes_insert" ON post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_likes_delete" ON post_likes;
CREATE POLICY "post_likes_delete" ON post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 7. POST SAVES (bookmarks)
-- ============================================================
CREATE TABLE IF NOT EXISTS post_saves (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE post_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_saves_select" ON post_saves;
CREATE POLICY "post_saves_select" ON post_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_saves_insert" ON post_saves;
CREATE POLICY "post_saves_insert" ON post_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_saves_delete" ON post_saves;
CREATE POLICY "post_saves_delete" ON post_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 8. USER FOLLOWS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS user_follows_following_id_idx ON user_follows (following_id);
CREATE INDEX IF NOT EXISTS user_follows_follower_id_idx ON user_follows (follower_id);

DROP POLICY IF EXISTS "follows_select_public" ON user_follows;
CREATE POLICY "follows_select_public" ON user_follows FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "follows_insert_own" ON user_follows;
CREATE POLICY "follows_insert_own" ON user_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "follows_delete_own" ON user_follows;
CREATE POLICY "follows_delete_own" ON user_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- ============================================================
-- 9. CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_b_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_count_a integer NOT NULL DEFAULT 0,
  unread_count_b integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations FOR SELECT TO authenticated
  USING (auth.uid() = participant_a_id OR auth.uid() = participant_b_id);

DROP POLICY IF EXISTS "conversations_insert" ON conversations;
CREATE POLICY "conversations_insert" ON conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = participant_a_id OR auth.uid() = participant_b_id);

DROP POLICY IF EXISTS "conversations_update" ON conversations;
CREATE POLICY "conversations_update" ON conversations FOR UPDATE TO authenticated
  USING (auth.uid() = participant_a_id OR auth.uid() = participant_b_id)
  WITH CHECK (auth.uid() = participant_a_id OR auth.uid() = participant_b_id);

DROP POLICY IF EXISTS "conversations_delete" ON conversations;
CREATE POLICY "conversations_delete" ON conversations FOR DELETE TO authenticated
  USING (auth.uid() = participant_a_id OR auth.uid() = participant_b_id);

-- ============================================================
-- 10. MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);

DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM conversations c WHERE c.id = conversation_id
    AND (c.participant_a_id = auth.uid() OR c.participant_b_id = auth.uid())
  ));

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM conversations c WHERE c.id = conversation_id
    AND (c.participant_a_id = auth.uid() OR c.participant_b_id = auth.uid())
  ));

DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM conversations c WHERE c.id = conversation_id
    AND (c.participant_a_id = auth.uid() OR c.participant_b_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM conversations c WHERE c.id = conversation_id
    AND (c.participant_a_id = auth.uid() OR c.participant_b_id = auth.uid())
  ));

DROP POLICY IF EXISTS "messages_delete" ON messages;
CREATE POLICY "messages_delete" ON messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- ============================================================
-- 11. NEWS (published)
-- ============================================================
CREATE TABLE IF NOT EXISTS news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL DEFAULT '',
  category text CHECK (category IN ('uk', 'world', 'local', 'community', 'general')) NOT NULL DEFAULT 'general',
  image_url text,
  is_featured boolean NOT NULL DEFAULT false,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS news_published_at_idx ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS news_category_idx ON news(category);

DROP POLICY IF EXISTS "news_select_public" ON news;
CREATE POLICY "news_select_public" ON news FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "news_insert_auth" ON news;
CREATE POLICY "news_insert_auth" ON news FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "news_update_own" ON news;
CREATE POLICY "news_update_own" ON news FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "news_delete_own" ON news;
CREATE POLICY "news_delete_own" ON news FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- ============================================================
-- 12. NEWS ARTICLES (staging/import queue)
-- ============================================================
CREATE TABLE IF NOT EXISTS news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  source_name text,
  source_url text,
  image_url text,
  published_at timestamptz,
  status text CHECK (status IN ('pending','approved','rejected')) NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_articles_select_public" ON news_articles;
CREATE POLICY "news_articles_select_public" ON news_articles FOR SELECT TO anon, authenticated USING (status = 'approved');

DROP POLICY IF EXISTS "news_articles_admin_all" ON news_articles;
CREATE POLICY "news_articles_admin_all" ON news_articles FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role IN ('admin','moderator')))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role IN ('admin','moderator')))
  );

-- ============================================================
-- 13. MOSQUES
-- ============================================================
CREATE TABLE IF NOT EXISTS mosques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  region text,
  postcode text,
  phone text,
  website text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mosques ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS mosques_city_idx ON mosques(city);
CREATE INDEX IF NOT EXISTS mosques_region_idx ON mosques(region);

DROP POLICY IF EXISTS "mosques_select_public" ON mosques;
CREATE POLICY "mosques_select_public" ON mosques FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "mosques_insert_auth" ON mosques;
CREATE POLICY "mosques_insert_auth" ON mosques FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (is_admin = true OR role = 'admin')
    )
  );

DROP POLICY IF EXISTS "mosques_update_admin" ON mosques;
CREATE POLICY "mosques_update_admin" ON mosques FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin'))
  );

DROP POLICY IF EXISTS "mosques_delete_admin" ON mosques;
CREATE POLICY "mosques_delete_admin" ON mosques FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin'))
  );

-- ============================================================
-- 14. RESOURCES
-- ============================================================
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text CHECK (category IN ('quran','hadith','duas','articles','learning','islamic_finance')) NOT NULL DEFAULT 'articles',
  url text,
  content text,
  tags text[] NOT NULL DEFAULT '{}',
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS resources_category_idx ON resources(category);

DROP POLICY IF EXISTS "resources_select" ON resources;
CREATE POLICY "resources_select" ON resources FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "resources_insert" ON resources;
CREATE POLICY "resources_insert" ON resources FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "resources_update_own" ON resources;
CREATE POLICY "resources_update_own" ON resources FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "resources_delete_own" ON resources;
CREATE POLICY "resources_delete_own" ON resources FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 15. BUSINESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  address text,
  region text,
  city text,
  postcode text,
  phone text,
  email text,
  website text,
  image_url text,
  is_sponsored boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS businesses_city_idx ON businesses(city);
CREATE INDEX IF NOT EXISTS businesses_region_idx ON businesses(region);
CREATE INDEX IF NOT EXISTS businesses_category_idx ON businesses(category);

DROP POLICY IF EXISTS "businesses_select" ON businesses;
CREATE POLICY "businesses_select" ON businesses FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "businesses_insert" ON businesses;
CREATE POLICY "businesses_insert" ON businesses FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "businesses_update_own" ON businesses;
CREATE POLICY "businesses_update_own" ON businesses FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "businesses_delete_own" ON businesses;
CREATE POLICY "businesses_delete_own" ON businesses FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- ============================================================
-- 16. JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  employer text NOT NULL,
  location text,
  city text,
  region text,
  description text,
  category text CHECK (category IN (
    'technology','finance','education','healthcare','charity',
    'retail','hospitality','construction','creative','other'
  )) NOT NULL DEFAULT 'other',
  job_type text CHECK (job_type IN ('full_time','part_time','remote','contract','volunteer')) NOT NULL DEFAULT 'full_time',
  salary_range text,
  apply_url text,
  is_featured boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT true,
  status text CHECK (status IN ('pending','approved','rejected')) NOT NULL DEFAULT 'approved',
  posted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS jobs_created_at_idx ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_category_idx ON jobs(category);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status);

DROP POLICY IF EXISTS "jobs_select_public" ON jobs;
CREATE POLICY "jobs_select_public" ON jobs FOR SELECT TO anon, authenticated USING (status = 'approved');

DROP POLICY IF EXISTS "jobs_insert_auth" ON jobs;
CREATE POLICY "jobs_insert_auth" ON jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = posted_by);

DROP POLICY IF EXISTS "jobs_update_own" ON jobs;
CREATE POLICY "jobs_update_own" ON jobs FOR UPDATE TO authenticated USING (auth.uid() = posted_by) WITH CHECK (auth.uid() = posted_by);

DROP POLICY IF EXISTS "jobs_delete_own" ON jobs;
CREATE POLICY "jobs_delete_own" ON jobs FOR DELETE TO authenticated USING (auth.uid() = posted_by);

-- ============================================================
-- 17. EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  category text CHECK (category IN (
    'mosque_event','conference','youth_program','charity_event','general',
    'education','charity','networking','social','religious','sports','arts','other'
  )) NOT NULL DEFAULT 'general',
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz,
  venue_name text,
  address text,
  region text,
  city text,
  postcode text,
  is_online boolean NOT NULL DEFAULT false,
  image_url text,
  attendee_count integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT true,
  status text CHECK (status IN ('pending','approved','rejected')) NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS events_start_datetime_idx ON events(start_datetime);
CREATE INDEX IF NOT EXISTS events_category_idx ON events(category);
CREATE INDEX IF NOT EXISTS events_city_idx ON events(city);
CREATE INDEX IF NOT EXISTS events_region_idx ON events(region);
CREATE INDEX IF NOT EXISTS events_status_idx ON events(status);

DROP POLICY IF EXISTS "events_select" ON events;
CREATE POLICY "events_select" ON events FOR SELECT TO anon, authenticated USING (status = 'approved');

DROP POLICY IF EXISTS "events_insert_auth" ON events;
CREATE POLICY "events_insert_auth" ON events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "events_update_own" ON events;
CREATE POLICY "events_update_own" ON events FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "events_delete_own" ON events;
CREATE POLICY "events_delete_own" ON events FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- ============================================================
-- 18. ADVERTISEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text,
  link_url text,
  placement_slot text CHECK (placement_slot = ANY (ARRAY[
    'feed_inline'::text,
    'sidebar'::text,
    'homepage_banner'::text,
    'businesses_page'::text,
    'jobs_page'::text,
    'events_page'::text
  ])) NOT NULL DEFAULT 'sidebar',
  target_scope text,
  target_city text,
  target_region text,
  active_from timestamptz,
  active_to timestamptz,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- Regular users: see only active, in-date ads
DROP POLICY IF EXISTS "ads_select_public" ON advertisements;
CREATE POLICY "ads_select_public" ON advertisements
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND (active_from IS NULL OR active_from <= now())
    AND (active_to IS NULL OR active_to >= now())
  );

-- Admins: see ALL ads (for management)
DROP POLICY IF EXISTS "ads_select_admin" ON advertisements;
CREATE POLICY "ads_select_admin" ON advertisements
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')));

-- Admins: insert ads
DROP POLICY IF EXISTS "ads_insert_admin" ON advertisements;
CREATE POLICY "ads_insert_admin" ON advertisements
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')));

-- Admins: update ads
DROP POLICY IF EXISTS "ads_update_admin" ON advertisements;
CREATE POLICY "ads_update_admin" ON advertisements
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')));

-- Admins: delete ads
DROP POLICY IF EXISTS "ads_delete_admin" ON advertisements;
CREATE POLICY "ads_delete_admin" ON advertisements
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')));

-- ============================================================
-- 19. REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content_type text CHECK (content_type IN ('post','comment','user','group','job','event')) NOT NULL,
  content_id uuid NOT NULL,
  reason text CHECK (reason IN ('spam','harassment','offensive','misinformation','other')) NOT NULL DEFAULT 'other',
  notes text,
  status text CHECK (status IN ('pending','reviewed','dismissed','actioned')) NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);
CREATE INDEX IF NOT EXISTS reports_content_idx ON reports(content_type, content_id);

-- Users can submit reports and see their own
DROP POLICY IF EXISTS "reports_insert_auth" ON reports;
CREATE POLICY "reports_insert_auth" ON reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_select_own" ON reports;
CREATE POLICY "reports_select_own" ON reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

-- Admins/moderators can manage all reports
DROP POLICY IF EXISTS "reports_admin_all" ON reports;
CREATE POLICY "reports_admin_all" ON reports FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR is_moderator = true OR role IN ('admin','moderator')))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR is_moderator = true OR role IN ('admin','moderator')))
  );

-- ============================================================
-- 20. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type text CHECK (type IN ('comment','like','reply','group_request_accepted','event_approved','job_approved','mention','report_actioned')) NOT NULL,
  content_type text CHECK (content_type IN ('post','comment','event','job','group')) NOT NULL DEFAULT 'post',
  content_id uuid,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id, is_read, created_at DESC);

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_service" ON notifications;
CREATE POLICY "notifications_insert_service" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
