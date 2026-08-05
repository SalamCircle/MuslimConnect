-- Migration 006: User dashboard + admin moderation fields

-- 1. Profiles: suspension and ban flags
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- 2. Posts: moderation fields
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('active','hidden','removed')) NOT NULL DEFAULT 'active';
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts(status);

-- 3. Jobs: proper status workflow
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('pending','approved','rejected')) NOT NULL DEFAULT 'approved';
-- Backfill: existing approved jobs stay approved
UPDATE jobs SET status = 'approved' WHERE is_approved = true;
UPDATE jobs SET status = 'pending' WHERE is_approved = false;
-- Update public SELECT policy to use status column
DROP POLICY IF EXISTS "jobs_select_public" ON jobs;
CREATE POLICY "jobs_select_public" ON jobs FOR SELECT TO anon, authenticated USING (status = 'approved');

-- 4. Events: proper status workflow
ALTER TABLE events ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('pending','approved','rejected')) NOT NULL DEFAULT 'approved';
UPDATE events SET status = 'approved' WHERE is_approved = true;
UPDATE events SET status = 'pending' WHERE is_approved = false;
DROP POLICY IF EXISTS "events_select" ON events;
CREATE POLICY "events_select" ON events FOR SELECT TO anon, authenticated USING (status = 'approved');

-- 5. Reports table
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
CREATE POLICY "reports_insert_auth" ON reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select_own" ON reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);
CREATE INDEX IF NOT EXISTS reports_content_idx ON reports(content_type, content_id);
