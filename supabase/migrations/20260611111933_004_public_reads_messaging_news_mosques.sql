-- Migration 004: Public reads, messaging RLS, news, mosques, resources seed

-- PUBLIC READS
DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "comments_select" ON comments;
CREATE POLICY "comments_select" ON comments FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "post_likes_select" ON post_likes;
CREATE POLICY "post_likes_select" ON post_likes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "communities_select" ON communities;
CREATE POLICY "communities_select" ON communities FOR SELECT TO anon, authenticated USING (is_public = true OR creator_id = auth.uid() OR creator_id IS NULL);

-- MESSAGING RLS
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;
DROP POLICY IF EXISTS "conversations_delete" ON conversations;

CREATE POLICY "conversations_select" ON conversations FOR SELECT TO authenticated
  USING (auth.uid() = participant_a_id OR auth.uid() = participant_b_id);
CREATE POLICY "conversations_insert" ON conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = participant_a_id OR auth.uid() = participant_b_id);
CREATE POLICY "conversations_update" ON conversations FOR UPDATE TO authenticated
  USING (auth.uid() = participant_a_id OR auth.uid() = participant_b_id);

DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;

CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM conversations c WHERE c.id = conversation_id
    AND (c.participant_a_id = auth.uid() OR c.participant_b_id = auth.uid())
  ));
CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM conversations c WHERE c.id = conversation_id
    AND (c.participant_a_id = auth.uid() OR c.participant_b_id = auth.uid())
  ));
CREATE POLICY "messages_update" ON messages FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id);

-- NEWS TABLE
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
CREATE POLICY "news_select_public" ON news FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "news_insert_auth" ON news FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "news_update_own" ON news FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "news_delete_own" ON news FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS news_published_at_idx ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS news_category_idx ON news(category);

-- MOSQUES TABLE
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
CREATE POLICY "mosques_select_public" ON mosques FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "mosques_insert_auth" ON mosques FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS mosques_city_idx ON mosques(city);
CREATE INDEX IF NOT EXISTS mosques_region_idx ON mosques(region);

-- Resources public read
DROP POLICY IF EXISTS "resources_select" ON resources;
CREATE POLICY "resources_select" ON resources FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "resources_insert" ON resources;
CREATE POLICY "resources_insert" ON resources FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Businesses public read
DROP POLICY IF EXISTS "businesses_select" ON businesses;
CREATE POLICY "businesses_select" ON businesses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "businesses_insert" ON businesses;
CREATE POLICY "businesses_insert" ON businesses FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

-- SEED: Mosques
INSERT INTO mosques (name, address, city, region, postcode, is_verified) VALUES
  ('East London Mosque', '82-92 Whitechapel Rd', 'London', 'London', 'E1 1JQ', true),
  ('Birmingham Central Mosque', '180 Belgrave Middleway', 'Birmingham', 'West Midlands', 'B12 0XS', true),
  ('Manchester Central Mosque', 'Upper Park Rd', 'Manchester', 'North West', 'M14 5RU', true),
  ('Leeds Grand Mosque', 'Woodsley Rd', 'Leeds', 'Yorkshire and The Humber', 'LS3 1DL', true),
  ('Bristol Jamia Mosque', 'Green Street', 'Bristol', 'South West', 'BS3 4UB', true),
  ('Glasgow Central Mosque', '1 Mosque Avenue', 'Glasgow', 'Scotland', 'G5 9TA', true),
  ('Cardiff Bay Mosque', 'Loudoun Square', 'Cardiff', 'Wales', 'CF10 5JB', true),
  ('Sheffield Islamic Centre', '49 Wolseley Rd', 'Sheffield', 'Yorkshire and The Humber', 'S8 0ZS', true),
  ('Leicester Central Mosque', 'Conduit St', 'Leicester', 'East Midlands', 'LE2 0JN', true),
  ('Northampton Jamia Mosque', 'St Edmunds Rd', 'Northampton', 'East Midlands', 'NN1 5DY', true),
  ('Bradford Grand Mosque', 'Westgate', 'Bradford', 'Yorkshire and The Humber', 'BD1 2QB', true),
  ('Coventry Jamia Mosque', 'Eagle Street', 'Coventry', 'West Midlands', 'CV1 4GS', true)
ON CONFLICT DO NOTHING;

-- SEED: News
INSERT INTO news (title, excerpt, category, is_featured, image_url) VALUES
  ('UK Muslims celebrate Eid across the country', 'Millions of Muslims across the United Kingdom celebrated Eid with prayers, community gatherings, and festivities in cities and towns.', 'uk', true, 'https://images.pexels.com/photos/3279132/pexels-photo-3279132.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('New Islamic Centre opens in Birmingham city centre', 'A new purpose-built Islamic Centre has opened its doors in Birmingham, providing prayer facilities and educational programmes.', 'local', false, 'https://images.pexels.com/photos/3886488/pexels-photo-3886488.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Ramadan 2026: Community iftar guide across the UK', 'Communities across the UK are hosting a variety of iftar events this Ramadan. From free community iftars at mosques to charity fundraising dinners.', 'community', false, 'https://images.pexels.com/photos/6646917/pexels-photo-6646917.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Muslim charity raises £2m for global humanitarian relief', 'A UK-based Muslim charity has announced a record-breaking fundraising campaign, raising over £2 million for communities affected by humanitarian crises.', 'uk', true, 'https://images.pexels.com/photos/6646917/pexels-photo-6646917.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Islamic finance sector continues to grow in the UK', 'The Islamic finance sector continues to expand with new halal mortgage products and shariah-compliant savings accounts being launched by major UK banks.', 'uk', false, 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('Youth Islamic education programme launches nationwide', 'A new nationwide Islamic education programme targeting young Muslims aged 11-18 has launched across 50 UK cities, offering weekend classes and mentorship.', 'community', false, 'https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=800')
ON CONFLICT DO NOTHING;
