-- TST: Table privileges for the authenticated and service_role roles.
-- Safe to re-run (GRANT is idempotent).
--
-- When tables are created via raw SQL (not the Supabase dashboard UI),
-- Supabase does NOT automatically grant access to the authenticated role.
-- Without these grants the Postgres error is:
--   "permission denied for table <name>"
-- even when RLS policies are in place.

-- ─── authenticated (normal app users) ────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE        ON public.profiles            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_words         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fact_assignments     TO authenticated;
GRANT SELECT, INSERT, UPDATE        ON public.quiz_attempts        TO authenticated;
GRANT SELECT, INSERT, UPDATE        ON public.notification_events  TO authenticated;
GRANT SELECT, INSERT               ON public.fact_reports         TO authenticated;

-- Read-only catalog tables
GRANT SELECT ON public.facts          TO authenticated;
GRANT SELECT ON public.app_users      TO authenticated;
GRANT SELECT ON public.interest_areas TO authenticated;
GRANT SELECT ON public.starter_words  TO authenticated;
GRANT SELECT ON public.feature_flags  TO authenticated;

-- ─── service_role (Edge Functions, server-side scripts) ───────────────────────

GRANT ALL ON public.profiles           TO service_role;
GRANT ALL ON public.saved_words        TO service_role;
GRANT ALL ON public.fact_assignments   TO service_role;
GRANT ALL ON public.quiz_attempts      TO service_role;
GRANT ALL ON public.notification_events TO service_role;
GRANT ALL ON public.fact_reports       TO service_role;
GRANT ALL ON public.facts              TO service_role;
GRANT ALL ON public.app_users          TO service_role;
GRANT ALL ON public.interest_areas     TO service_role;
GRANT ALL ON public.starter_words      TO service_role;
GRANT ALL ON public.feature_flags      TO service_role;
