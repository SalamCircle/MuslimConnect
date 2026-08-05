-- Migration 007: RBAC role column, notifications, news_articles

-- 1. Add role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text CHECK (role IN ('admin','moderator','user')) NOT NULL DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_moderator boolean NOT NULL DEFAULT false;

-- Backfill: existing admins get admin role
UPDATE profiles SET role = 'admin', is_admin = true WHERE is_admin = true;

-- 2. Notifications table
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
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_service" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id, is_read, created_at DESC);

-- 3. News articles staging table
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
CREATE POLICY "news_articles_admin_all" ON news_articles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role IN ('admin','moderator')))
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role IN ('admin','moderator')))
);

-- 4. Admin-only reports policy (admins can read all reports)
CREATE POLICY "reports_admin_all" ON reports FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR is_moderator = true OR role IN ('admin','moderator')))
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR is_moderator = true OR role IN ('admin','moderator')))
);

-- 5. Seed sample news articles for import queue
INSERT INTO news_articles (title, summary, source_name, source_url, status)
VALUES
  ('UK Muslim Council Calls for Greater Community Investment', 'The Muslim Council of Britain has issued a statement calling for increased government investment in Muslim communities across the UK.', 'MCB News', 'https://mcb.org.uk', 'pending'),
  ('New Halal Certification Standards Announced for 2026', 'UK food standards authority outlines updated halal certification requirements taking effect next year.', 'HFA UK', 'https://hfa.org.uk', 'pending'),
  ('Birmingham Islamic Centre Wins Architecture Award', 'The newly opened Birmingham Islamic Centre has been recognised for its innovative design blending modern and traditional Islamic architecture.', 'Architecture Today', 'https://architecturetoday.co.uk', 'pending');
