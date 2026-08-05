-- Index on location_scope for .in('location_scope', [...]) queries used in every scoped feed load
CREATE INDEX IF NOT EXISTS posts_location_scope_idx ON public.posts USING btree (location_scope);

-- Composite index: status + created_at for the standard feed query pattern
-- (.eq('status','active').order('created_at', { ascending: false }))
-- Allows Postgres to satisfy both the equality filter and the sort in one index scan
CREATE INDEX IF NOT EXISTS posts_status_created_at_idx ON public.posts USING btree (status, created_at DESC);

-- Composite: status + city for the city-scope Q2 query
-- (.eq('status','active').ilike('city', ...))
CREATE INDEX IF NOT EXISTS posts_status_city_idx ON public.posts USING btree (status, city);

-- Composite: status + region for the region-scope Q2 query
CREATE INDEX IF NOT EXISTS posts_status_region_idx ON public.posts USING btree (status, region);

-- Composite: status + location_scope + created_at for the broad Q1 query
-- (.eq('status','active').in('location_scope',[...]).order('created_at', ...))
CREATE INDEX IF NOT EXISTS posts_status_scope_created_idx ON public.posts USING btree (status, location_scope, created_at DESC);
