-- Add location-targeting columns to advertisements
ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS target_scope  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_city   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_region TEXT DEFAULT NULL;

-- Drop the overly restrictive single SELECT policy
DROP POLICY IF EXISTS advertisements_select ON advertisements;

-- Regular users: see only active, in-date ads
CREATE POLICY "ads_select_public" ON advertisements
  FOR SELECT
  USING (
    is_active = true
    AND (active_from IS NULL OR active_from <= now())
    AND (active_to   IS NULL OR active_to   >= now())
  );

-- Admins: see ALL ads (for management)
CREATE POLICY "ads_select_admin" ON advertisements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins: insert ads
CREATE POLICY "ads_insert_admin" ON advertisements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins: update ads
CREATE POLICY "ads_update_admin" ON advertisements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins: delete ads
CREATE POLICY "ads_delete_admin" ON advertisements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
