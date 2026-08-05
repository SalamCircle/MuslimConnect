ALTER TABLE advertisements
  DROP CONSTRAINT advertisements_placement_slot_check;

ALTER TABLE advertisements
  ADD CONSTRAINT advertisements_placement_slot_check
  CHECK (placement_slot = ANY (ARRAY[
    'feed_inline'::text,
    'sidebar'::text,
    'homepage_banner'::text,
    'businesses_page'::text,
    'jobs_page'::text,
    'events_page'::text
  ]));