-- 1. Create jobs table
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
  posted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_select_public" ON jobs FOR SELECT TO anon, authenticated USING (is_approved = true);
CREATE POLICY "jobs_insert_auth" ON jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = posted_by);
CREATE POLICY "jobs_update_own" ON jobs FOR UPDATE TO authenticated USING (auth.uid() = posted_by);
CREATE POLICY "jobs_delete_own" ON jobs FOR DELETE TO authenticated USING (auth.uid() = posted_by);

CREATE INDEX IF NOT EXISTS jobs_created_at_idx ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_category_idx ON jobs(category);

-- 2. Update events table: drop old category check, add broader categories
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_category_check;
ALTER TABLE events ADD CONSTRAINT events_category_check CHECK (category IN (
  'mosque_event','conference','youth_program','charity_event','general',
  'education','charity','networking','social','religious','sports','arts','other'
));
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true;
ALTER TABLE events ALTER COLUMN creator_id DROP NOT NULL;

-- 3. Fix events RLS to allow anon reads
DROP POLICY IF EXISTS "events_select" ON events;
CREATE POLICY "events_select" ON events FOR SELECT TO anon, authenticated USING (is_approved = true);

-- 4. Fix advertisements RLS to allow anon reads
DROP POLICY IF EXISTS "advertisements_select" ON advertisements;
CREATE POLICY "advertisements_select" ON advertisements FOR SELECT TO anon, authenticated USING (
  is_active = true
  AND (active_from IS NULL OR active_from <= now())
  AND (active_to IS NULL OR active_to >= now())
);

-- 5. Add is_admin to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 6. Seed sample jobs
INSERT INTO jobs (title, employer, location, city, region, description, category, job_type, salary_range, is_featured, is_approved)
VALUES
  ('Full Stack Developer', 'Halal Tech Ltd', 'London (Hybrid)', 'London', 'London', 'Full stack developer for ethical fintech products. Node.js, React, PostgreSQL required.', 'technology', 'full_time', '£55,000 – £70,000', true, true),
  ('Islamic Studies Teacher', 'Al-Noor Academy', 'Birmingham', 'Birmingham', 'West Midlands', 'Islamic Studies teacher for secondary school. QTS preferred.', 'education', 'full_time', '£28,000 – £38,000', false, true),
  ('Finance Manager', 'Amanah Finance', 'Manchester', 'Manchester', 'North West', 'ACCA/CIMA qualified finance manager for Islamic finance products and compliance.', 'finance', 'full_time', '£45,000 – £55,000', true, true),
  ('Community Fundraiser', 'Muslim Hands UK', 'Nottingham', 'Nottingham', 'East Midlands', 'Fundraiser to grow our donor community and run local charity events.', 'charity', 'full_time', '£24,000 – £28,000', false, true),
  ('UX Designer', 'Crescent Digital', 'Remote', NULL, NULL, 'UX Designer for our Muslim lifestyle app. Fully remote.', 'technology', 'remote', '£40,000 – £50,000', false, true);

-- 7. Seed sample events
INSERT INTO events (title, description, category, venue_name, city, region, start_datetime, end_datetime, is_online, is_featured, is_approved)
VALUES
  ('Manchester Muslim Professionals Networking', 'Monthly networking for Muslim professionals. Connect, collaborate, and grow over light refreshments.', 'networking', 'Manchester Conference Centre', 'Manchester', 'North West', now() + interval '5 days', now() + interval '5 days' + interval '3 hours', false, true, true),
  ('Quran Memorisation Workshop', 'One-day intensive Tajweed and Hifz workshop for adults and teens. All levels welcome.', 'religious', 'East London Mosque', 'London', 'London', now() + interval '8 days', now() + interval '8 days' + interval '6 hours', false, false, true),
  ('Muslim Entrepreneurs Summit 2026', 'Annual summit for Muslim business owners, investors, and founders.', 'conference', 'Birmingham ICC', 'Birmingham', 'West Midlands', now() + interval '14 days', now() + interval '15 days', false, true, true),
  ('Online Arabic for Beginners', 'Free 6-week online course. Live sessions every Saturday morning.', 'education', 'Online', NULL, NULL, now() + interval '3 days', now() + interval '3 days' + interval '2 hours', true, false, true),
  ('Sisters Halaqa & Wellbeing Morning', 'Monthly halaqa and wellbeing activities for sisters. Light breakfast provided.', 'general', 'Leeds Grand Mosque', 'Leeds', 'Yorkshire and The Humber', now() + interval '10 days', now() + interval '10 days' + interval '3 hours', false, false, true);
