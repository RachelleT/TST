-- TST Phase 0: Row-level security policies
-- Run this in the Supabase dashboard SQL Editor AFTER 001_initial_schema.sql.

-- Enable RLS on all user-data tables
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_words       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_areas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starter_words     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags     ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users WHERE user_id = auth.uid()
  );
$$;

-- ─── profiles ────────────────────────────────────────────────────────────────

CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─── saved_words ─────────────────────────────────────────────────────────────

CREATE POLICY "Users can manage their own saved words"
  ON public.saved_words FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── fact_assignments ─────────────────────────────────────────────────────────

CREATE POLICY "Users can manage their own fact assignments"
  ON public.fact_assignments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── quiz_attempts ───────────────────────────────────────────────────────────

CREATE POLICY "Users can manage their own quiz attempts"
  ON public.quiz_attempts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── notification_events ─────────────────────────────────────────────────────

CREATE POLICY "Users can manage their own notification events"
  ON public.notification_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── fact_reports ─────────────────────────────────────────────────────────────

CREATE POLICY "Users can submit fact reports"
  ON public.fact_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own reports"
  ON public.fact_reports FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can update fact reports"
  ON public.fact_reports FOR UPDATE
  USING (public.is_admin());

-- ─── facts ────────────────────────────────────────────────────────────────────

CREATE POLICY "Anyone authenticated can read facts"
  ON public.facts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage facts"
  ON public.facts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── app_users ───────────────────────────────────────────────────────────────

CREATE POLICY "Admins can read app_users"
  ON public.app_users FOR SELECT
  USING (public.is_admin());

-- ─── interest_areas ──────────────────────────────────────────────────────────

CREATE POLICY "Anyone authenticated can read interest areas"
  ON public.interest_areas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage interest areas"
  ON public.interest_areas FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── starter_words ────────────────────────────────────────────────────────────

CREATE POLICY "Anyone authenticated can read starter words"
  ON public.starter_words FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage starter words"
  ON public.starter_words FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── feature_flags ────────────────────────────────────────────────────────────

CREATE POLICY "Anyone authenticated can read feature flags"
  ON public.feature_flags FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
