/*
# Auto-create profile on user signup

Adds a database trigger that automatically inserts a `profiles` row whenever a
new user is created in `auth.users` (i.e. on supabase.auth.signUp()). This
guarantees every authenticated user has a corresponding profile row.

## New objects
1. public.handle_new_user() — SECURITY DEFINER trigger function that inserts a
   profiles row seeded with the new user's id, email, and full_name (if
   provided in raw_user_meta_data). Uses ON CONFLICT (id) DO NOTHING so it is
   safe even if the frontend also inserts a profile row.
2. Trigger on_auth_user_created — AFTER INSERT ON auth.users calling the
   function for each row.

## Security
- Function is SECURITY DEFINER with search_path = pg_catalog, public.
- EXECUTE is revoked from PUBLIC, anon, and authenticated so the function can
  only be invoked by the internal trigger.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;