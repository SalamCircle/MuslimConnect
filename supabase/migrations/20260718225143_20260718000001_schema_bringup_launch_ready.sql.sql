/*
# ConnectMuslim — Schema Bring-Up to Launch-Ready

## What this migration does
Brings the database from the early MVP schema (migrations 002-003) up to the
full launch-ready schema. Some tables already existed (profiles, communities,
community_members, posts, comments, post_likes, post_saves) but were missing
newer columns. The remaining 13 tables did not exist at all.

## Changes
1. profiles — ADD missing columns: username, is_admin, is_moderator, is_suspended,
   is_banned, role, followers_count, following_count + username unique index.
2. communities — ADD missing column: slug + unique index.
3. posts — ADD missing columns: share_count, slug, is_featured, is_approved,
   status + slug unique index + extra feed indexes.
4. CREATE 13 new tables: user_follows, conversations, messages, news,
   news_articles, mosques, resources, businesses, jobs, events,
   advertisements, reports, notifications — each with RLS enabled and
   per-CRUD policies (separate SELECT/INSERT/UPDATE/DELETE, no FOR ALL except
   the existing admin-bypass patterns on news_articles and reports).
5. Adds missing indexes on existing tables.

## Security
- Every new table has RLS ENABLED.
- Public directories (mosques, businesses, jobs approved, events approved,
  news, profiles non-sensitive, follows, communities public) are readable by
  anon + authenticated so the no-login browsing experience works.
- Owner-scoped writes use auth.uid() ownership checks.
- Admin-only tables (advertisements, mosque inserts) require role check.

## Data safety
- Only additive: ADD COLUMN IF NOT EXISTS and CREATE TABLE IF NOT EXISTS.
- No DROP, DELETE, type changes, or renames.
- Idempotent via IF NOT EXISTS / DROP POLICY IF EXISTS.
*/

-- ============================================================
-- 1. PROFILES — add missing columns
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_moderator boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers_count integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count integer NOT NULL DEFAULT 0;

-- Add CHECK constraint on role (drop first for idempotency)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin','moderator','user'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON profiles (username);
CREATE INDEX IF NOT EXISTS profiles_region_idx ON profiles(region);
CREATE INDEX IF NOT EXISTS profiles_city_idx ON profiles(city);

-- Replace profiles policies with the launch-ready set (drop legacy first)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- ============================================================
-- 2. COMMUNITIES — add slug
-- ============================================================
ALTER TABLE communities ADD COLUMN IF NOT EXISTS slug text;

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
-- 3. POSTS — add missing columns + indexes
-- ============================================================
ALTER TABLE posts ADD COLUMN IF NOT EXISTS share_count integer NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_status_check') THEN
    ALTER TABLE posts ADD CONSTRAINT posts_status_check CHECK (status IN ('active','hidden','removed'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_unique ON posts (slug);
CREATE INDEX IF NOT EXISTS posts_user_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_community_idx ON posts(community_id);
CREATE INDEX IF NOT EXISTS posts_region_idx ON posts(region);
CREATE INDEX IF NOT EXISTS posts_city_idx ON posts(city);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
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
-- 4. USER FOLLOWS
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
-- 5. CONVERSATIONS
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
-- 6. MESSAGES
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
-- 7. NEWS (published)
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
-- 8. NEWS ARTICLES (staging/import queue)
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
-- 9. MOSQUES
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
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')));

DROP POLICY IF EXISTS "mosques_update_admin" ON mosques;
CREATE POLICY "mosques_update_admin" ON mosques FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')));

DROP POLICY IF EXISTS "mosques_delete_admin" ON mosques;
CREATE POLICY "mosques_delete_admin" ON mosques FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')));

-- ============================================================
-- 10. RESOURCES
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
-- 11. BUSINESSES
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
-- 12. JOBS
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
-- 13. EVENTS
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
CREATE POLICY "events_insert_auth" ON events FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "events_update_own" ON events;
CREATE POLICY "events_update_own" ON events FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "events_delete_own" ON events;
CREATE POLICY "events_delete_own" ON events FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- ============================================================
-- 14. ADVERTISEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text,
  link_url text,
  placement_slot text CHECK (placement_slot = ANY (ARRAY[
    'feed_inline'::text, 'sidebar'::text, 'homepage_banner'::text,
    'businesses_page'::text, 'jobs_page'::text, 'events_page'::text
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

DROP POLICY IF EXISTS "ads_select_public" ON advertisements;
CREATE POLICY "ads_select_public" ON advertisements
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND (active_from IS NULL OR active_from <= now())
    AND (active_to IS NULL OR active_to >= now())
  );

DROP POLICY IF EXISTS "ads_select_admin" ON advertisements;
CREATE POLICY "ads_select_admin" ON advertisements
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')));

DROP POLICY IF EXISTS "ads_insert_admin" ON advertisements;
CREATE POLICY "ads_insert_admin" ON advertisements
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')));

DROP POLICY IF EXISTS "ads_update_admin" ON advertisements;
CREATE POLICY "ads_update_admin" ON advertisements
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')));

DROP POLICY IF EXISTS "ads_delete_admin" ON advertisements;
CREATE POLICY "ads_delete_admin" ON advertisements
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role = 'admin')));

-- ============================================================
-- 15. REPORTS
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

DROP POLICY IF EXISTS "reports_insert_auth" ON reports;
CREATE POLICY "reports_insert_auth" ON reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_select_own" ON reports;
CREATE POLICY "reports_select_own" ON reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_admin_all" ON reports;
CREATE POLICY "reports_admin_all" ON reports FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR is_moderator = true OR role IN ('admin','moderator')))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR is_moderator = true OR role IN ('admin','moderator')))
  );

-- ============================================================
-- 16. NOTIFICATIONS
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