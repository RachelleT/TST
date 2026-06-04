-- Phase 5: Add onboarding tracking to profiles
-- Run in the Supabase dashboard SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Existing users are treated as having already completed onboarding —
-- they joined before this flow existed and should go straight to library.
UPDATE public.profiles
SET onboarding_completed_at = now()
WHERE onboarding_completed_at IS NULL;
