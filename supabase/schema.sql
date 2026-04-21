-- ============================================================
-- LifeLog Database Schema v1
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS (profile table extending auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id             UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name   TEXT,
  calorie_target INTEGER DEFAULT 2000,
  sleep_target   DECIMAL(4,1) DEFAULT 8.0,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ENTRIES (one per day per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.entries (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date        DATE NOT NULL,
  highlight   TEXT CHECK (char_length(highlight) <= 500),
  lowlight    TEXT CHECK (char_length(lowlight) <= 500),
  mood        SMALLINT CHECK (mood >= 1 AND mood <= 100),
  notes       TEXT,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, date)
);

ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entries_all_own" ON public.entries
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entries_updated_at
  BEFORE UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- HABITS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.habits (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  category    TEXT,
  color       TEXT DEFAULT '#4a7c59',
  icon        TEXT,
  archived    BOOLEAN DEFAULT FALSE NOT NULL,
  sort_order  INTEGER DEFAULT 0 NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habits_all_own" ON public.habits
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- HABIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  habit_id    UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date        DATE NOT NULL,
  completed   BOOLEAN DEFAULT FALSE NOT NULL,
  UNIQUE (habit_id, date)
);

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habit_logs_all_own" ON public.habit_logs
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- WORKOUTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workouts (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date          DATE NOT NULL,
  exercise      TEXT NOT NULL,
  muscle_group  TEXT CHECK (muscle_group IN ('chest','back','legs','shoulders','arms','core','cardio')),
  sets          SMALLINT,
  reps          SMALLINT,
  weight        DECIMAL(6,2),
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workouts_all_own" ON public.workouts
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- NUTRITION
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nutrition (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date        DATE NOT NULL,
  calories    INTEGER,
  protein     DECIMAL(6,1),
  carbs       DECIMAL(6,1),
  fat         DECIMAL(6,1),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, date)
);

ALTER TABLE public.nutrition ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nutrition_all_own" ON public.nutrition
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER nutrition_updated_at
  BEFORE UPDATE ON public.nutrition
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- SLEEP
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sleep (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date        DATE NOT NULL,
  hours       DECIMAL(4,1) CHECK (hours >= 0 AND hours <= 24),
  quality     SMALLINT CHECK (quality >= 1 AND quality <= 5),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, date)
);

ALTER TABLE public.sleep ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sleep_all_own" ON public.sleep
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER sleep_updated_at
  BEFORE UPDATE ON public.sleep
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.goals (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL CHECK (type IN ('numeric', 'binary')),
  target        DECIMAL(10,2),
  current       DECIMAL(10,2) DEFAULT 0,
  unit          TEXT,
  deadline      DATE,
  completed     BOOLEAN DEFAULT FALSE NOT NULL,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_all_own" ON public.goals
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- REFLECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reflections (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('weekly', 'monthly')),
  date        DATE NOT NULL,
  content     JSONB DEFAULT '{}' NOT NULL,
  auto_stats  JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, type, date)
);

ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reflections_all_own" ON public.reflections
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER reflections_updated_at
  BEFORE UPDATE ON public.reflections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- MEDIA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.media (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_id    UUID REFERENCES public.entries(id) ON DELETE SET NULL,
  file_url    TEXT NOT NULL,
  file_type   TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_all_own" ON public.media
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES (performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON public.entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON public.habit_logs(habit_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON public.workouts(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_user_date ON public.nutrition(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_user_date ON public.sleep(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user_deadline ON public.goals(user_id, deadline ASC);
CREATE INDEX IF NOT EXISTS idx_media_user_entry ON public.media(user_id, entry_id);
