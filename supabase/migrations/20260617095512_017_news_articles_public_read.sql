-- news_articles had only an admin-only ALL policy, so nobody else could read them.
-- Add public read access for approved articles and full CRUD for admins/moderators.
CREATE POLICY "news_articles_select_public"
  ON public.news_articles
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');
