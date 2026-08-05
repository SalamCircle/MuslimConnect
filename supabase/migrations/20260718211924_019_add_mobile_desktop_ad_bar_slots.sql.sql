/*
# Add mobile & desktop ad bar placement slots

## Purpose
Expands the `placement_slot` CHECK constraint on the `advertisements` table so
admins can place ads in dedicated mobile and desktop ad bars — specifically:
  - `mobile_top`    — compact bar shown on mobile directly below the top menu
  - `mobile_bottom` — compact bar shown on mobile directly above the bottom tab bar
  - `desktop_top`   — full-width banner shown on desktop at the top of the content area

## Changes
1. Modified table: `advertisements`
   - Drops and recreates the `placement_slot` CHECK constraint to include the
     three new slots alongside the existing six (`feed_inline`, `sidebar`,
     `homepage_banner`, `businesses_page`, `jobs_page`, `events_page`).
   - No columns are added, removed, or renamed — only the allowed value list grows.

## Security
- No RLS policy changes. Existing public/admin policies remain in effect.
- The new slots are covered by the same `ads_select_public` (active + in-date)
  and `ads_*_admin` (admin-only mutations) policies already on the table.

## Notes
1. This migration is safe to re-run: the constraint is dropped and recreated each time.
2. No data is lost — the existing six slot values are preserved in the new array.
3. The DEFAULT remains `sidebar`, so existing behavior is unchanged for ads
   created without an explicit slot.
*/

ALTER TABLE advertisements
  DROP CONSTRAINT IF EXISTS advertisements_placement_slot_check;

ALTER TABLE advertisements
  ADD CONSTRAINT advertisements_placement_slot_check
  CHECK (placement_slot = ANY (ARRAY[
    'feed_inline'::text,
    'sidebar'::text,
    'homepage_banner'::text,
    'businesses_page'::text,
    'jobs_page'::text,
    'events_page'::text,
    'mobile_top'::text,
    'mobile_bottom'::text,
    'desktop_top'::text
  ]));
