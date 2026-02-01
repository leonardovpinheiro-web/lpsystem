-- Add completed_at column to logbook_weeks table
-- This field marks when the student explicitly finished the workout session
ALTER TABLE public.logbook_weeks 
ADD COLUMN completed_at timestamptz DEFAULT NULL;