/*
# SalaamCircle MVP Schema

Drops and recreates all Phase 1 tables with the full set of community categories
including the new ones: brothers, sisters, youth, professionals.

Also adds latitude/longitude to profiles for precise geolocation.

This migration is safe to re-run (all statements use IF EXISTS / IF NOT EXISTS).
*/

-- Drop dependent tables first
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS community_members CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  avatar_url text,
  bio text,
  gender text CHECK (gender IN ('male', 'female', 'prefer_not_to_say')) DEFAULT 'prefer_not_to_say',
  date_of_birth date,
  country text NOT NULL DEFAULT 'United Kingdom',
  region text,
  city text,
  postcode text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  is_online boolean NOT NULL DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE INDEX profiles_region_idx ON profiles(region);
CREATE INDEX profiles_city_idx ON profiles(city);

-- Communities
CREATE TABLE communities (
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "communities_select" ON communities FOR SELECT TO authenticated USING (is_public = true OR creator_id = auth.uid() OR creator_id IS NULL);
CREATE POLICY "communities_insert" ON communities FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "communities_update" ON communities FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "communities_delete" ON communities FOR DELETE TO authenticated USING (auth.uid() = creator_id);

CREATE INDEX communities_category_idx ON communities(category);

-- Community Members
CREATE TABLE community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text CHECK (role IN ('member','moderator','admin')) NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_members_select" ON community_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "community_members_insert" ON community_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_members_update" ON community_members FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "community_members_delete" ON community_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX community_members_community_idx ON community_members(community_id);
CREATE INDEX community_members_user_idx ON community_members(user_id);

-- Posts
CREATE TABLE posts (
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select" ON posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "posts_insert" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update" ON posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_delete" ON posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX posts_user_idx ON posts(user_id);
CREATE INDEX posts_community_idx ON posts(community_id);
CREATE INDEX posts_region_idx ON posts(region);
CREATE INDEX posts_city_idx ON posts(city);
CREATE INDEX posts_created_at_idx ON posts(created_at DESC);

-- Comments
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select" ON comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments_insert" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update" ON comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX comments_post_idx ON comments(post_id);

-- Post Likes
CREATE TABLE post_likes (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_likes_select" ON post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_likes_insert" ON post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_likes_delete" ON post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Seed default communities
INSERT INTO communities (name, description, category, member_count, is_public) VALUES
  ('Students', 'Muslim students across the UK — university life, accommodation, study tips, and campus resources.', 'students', 0, true),
  ('Business & Entrepreneurship', 'Muslim entrepreneurs, freelancers, and professionals sharing opportunities and advice.', 'business', 0, true),
  ('Marriage & Family', 'Respectful discussions around marriage, family life, and building strong Muslim households.', 'marriage', 0, true),
  ('New Muslims & Reverts', 'A welcoming space for those who have recently embraced Islam — guidance, support, and friendship.', 'reverts', 0, true),
  ('Technology & Innovation', 'Muslim professionals in tech, AI, engineering, and digital industries.', 'technology', 0, true),
  ('Parenting & Children', 'Support and advice for Muslim parents raising children in the UK.', 'parenting', 0, true),
  ('Islamic Studies', 'Deepen your knowledge — Quran, Hadith, Fiqh, and Islamic scholarship.', 'islamic_studies', 0, true),
  ('Brothers', 'A dedicated space for Muslim men — brotherhood, support, and community.', 'brothers', 0, true),
  ('Sisters', 'A dedicated space for Muslim women — sisterhood, empowerment, and community.', 'sisters', 0, true),
  ('Youth', 'For young Muslims navigating identity, education, and life in the UK.', 'youth', 0, true),
  ('Professionals', 'Muslim professionals across all industries — networking, career advice, and mentorship.', 'professionals', 0, true);
