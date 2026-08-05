/*
# Add trust-signal columns to jobs

## Purpose
Supports the Jobs Board review feedback: show "Verified employer" badges and
"Closes <date>" / "Posted <x> ago" on job cards so users can judge whether a
vacancy is current and credible. Job scams are a major platform risk, and these
two columns back the trust signals in the UI.

## Changes
1. New columns on `jobs` (both nullable, additive — no existing data is changed):
   - `closing_date` (timestamptz, nullable) — the date applications close.
     Nullable because existing rows and roles without a fixed deadline stay valid.
     The UI treats null as "no closing date"; a past date is shown as "Closed".
   - `is_employer_verified` (boolean, default false) — whether the posting
     organisation has been verified by ConnectMuslim admins. Defaults to false so
     every existing row reads as unverified (not a trust claim) until an admin
     flips it. This is an admin-controlled flag, not user-editable.

2. Indexes
   - `jobs_closing_date_idx` on `closing_date` — supports "closing soon" sorting
     and filtering out closed roles.
   - `jobs_is_employer_verified_idx` on `is_employer_verified` — low overhead,
     supports ordering verified employers first.

## Security
- No RLS policy changes. Existing `jobs` RLS policies continue to govern access;
  the new columns inherit the table's row-level visibility. No policy references
  these columns, so no policy rewrite is required.
- `is_employer_verified` is set by admins only (the existing admin-only update
  path already covers `jobs`); regular insert paths default it to false.

## Notes
1. Additive only — no `DROP`, no type changes, no renames. Safe to re-run.
2. `IF NOT EXISTS` guards make the ALTER statements idempotent.
3. The dashboard "Post a Job" form will gain optional `closing_date` input.
   `is_employer_verified` is NOT exposed in the user form — only admins set it.
*/

-- Add closing_date (nullable; existing rows stay null)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'closing_date'
  ) THEN
    ALTER TABLE jobs ADD COLUMN closing_date timestamptz;
  END IF;
END $$;

-- Add is_employer_verified (boolean, default false)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'is_employer_verified'
  ) THEN
    ALTER TABLE jobs ADD COLUMN is_employer_verified boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Indexes for the new trust-signal columns
CREATE INDEX IF NOT EXISTS jobs_closing_date_idx ON jobs (closing_date);
CREATE INDEX IF NOT EXISTS jobs_is_employer_verified_idx ON jobs (is_employer_verified);
