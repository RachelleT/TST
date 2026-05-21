-- TST Phase 0: Initial schema
-- Run this in the Supabase dashboard SQL Editor.

-- ─── profiles ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name          text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  notification_settings jsonb NOT NULL DEFAULT '{
    "enabled": false,
    "morning_time": "08:00",
    "noon_time": "12:00",
    "evening_time": "19:00",
    "days": ["mon","tue","wed","thu","fri","sat","sun"],
    "sound": false,
    "vibration": false
  }'::jsonb,
  quiz_settings         jsonb NOT NULL DEFAULT '{
    "default_length": 10,
    "enabled_formats": ["def_to_word","word_to_def","synonym","fill_in_sentence","word_for_description"]
  }'::jsonb,
  interest_areas        text[] NOT NULL DEFAULT '{}',
  analytics_opted_in    boolean NOT NULL DEFAULT true,
  theme_preference      text NOT NULL DEFAULT 'system'
    CHECK (theme_preference IN ('system', 'light', 'dark')),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- create a profile row automatically when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── app_users (admin allowlist) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.app_users (
  user_id    uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── facts ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.facts (
  id               text PRIMARY KEY,
  category         text NOT NULL
    CHECK (category IN ('flag', 'landmark', 'constellation', 'animal', 'geography')),
  region           text NOT NULL,
  name             text NOT NULL,
  name_local       text,
  illustration_path text NOT NULL,
  fact_sentence    text NOT NULL,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_facts_updated_at
  BEFORE UPDATE ON public.facts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── saved_words ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_words (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word             text NOT NULL,
  sense_index      integer NOT NULL DEFAULT 0,
  part_of_speech   text NOT NULL,
  pronunciation    text,
  definition       text NOT NULL,
  example_sentence text,
  synonyms         text[] NOT NULL DEFAULT '{}',
  card_number      integer NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, word, sense_index)
);

CREATE INDEX IF NOT EXISTS idx_saved_words_user_created
  ON public.saved_words(user_id, created_at DESC);

CREATE TRIGGER trg_saved_words_updated_at
  BEFORE UPDATE ON public.saved_words
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── fact_assignments ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fact_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  saved_word_id uuid NOT NULL REFERENCES public.saved_words(id) ON DELETE CASCADE,
  fact_id       text NOT NULL REFERENCES public.facts(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (saved_word_id)
);

-- ─── quiz_attempts ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  saved_word_id   uuid NOT NULL REFERENCES public.saved_words(id) ON DELETE CASCADE,
  question_format text NOT NULL
    CHECK (question_format IN ('def_to_word','word_to_def','synonym','fill_in_sentence','word_for_description')),
  result          text NOT NULL
    CHECK (result IN ('correct','incorrect','synonym_accepted')),
  user_answer     text NOT NULL,
  expected_answer text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_word
  ON public.quiz_attempts(user_id, saved_word_id, created_at DESC);

-- ─── notification_events ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  saved_word_id uuid REFERENCES public.saved_words(id) ON DELETE SET NULL,
  slot          text NOT NULL
    CHECK (slot IN ('morning','noon','evening','reengagement')),
  mode          text NOT NULL
    CHECK (mode IN ('definition','sentence','synonym','nudge')),
  fired_at      timestamptz NOT NULL,
  tapped_at     timestamptz
);

-- ─── fact_reports ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fact_reports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fact_id        text NOT NULL REFERENCES public.facts(id),
  category       text NOT NULL
    CHECK (category IN ('factually_incorrect','outdated','culturally_insensitive','spelling_grammar','other')),
  note           text,
  status         text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','fixed','dismissed')),
  admin_response text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz
);

-- ─── interest_areas ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.interest_areas (
  id         text PRIMARY KEY,
  label      text NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── starter_words ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.starter_words (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_area  text NOT NULL REFERENCES public.interest_areas(id),
  word           text NOT NULL,
  part_of_speech text NOT NULL,
  pronunciation  text,
  definition     text NOT NULL,
  example_sentence text,
  synonyms       text[] NOT NULL DEFAULT '{}',
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ─── feature_flags ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key        text PRIMARY KEY,
  value      boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default flags
INSERT INTO public.feature_flags (key, value) VALUES
  ('paywall_enabled', false)
ON CONFLICT (key) DO NOTHING;
