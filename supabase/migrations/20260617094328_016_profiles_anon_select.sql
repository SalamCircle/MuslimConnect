-- Allow anon users to read profiles so the PostgREST INNER JOIN on posts→profiles
-- does not silently drop all posts when the request lacks a valid JWT.
-- The feed SELECT only requests: id, full_name, avatar_url, city, region —
-- none of which are sensitive. Authenticated users already had unrestricted access.
CREATE POLICY "profiles_select_anon"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);
