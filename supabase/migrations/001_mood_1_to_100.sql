-- Widen mood range from 1-5 to 1-100
-- Run this in Supabase SQL Editor before deploying the new slider UI

ALTER TABLE public.entries
  DROP CONSTRAINT IF EXISTS entries_mood_check;

ALTER TABLE public.entries
  ADD CONSTRAINT entries_mood_check CHECK (mood >= 1 AND mood <= 100);
