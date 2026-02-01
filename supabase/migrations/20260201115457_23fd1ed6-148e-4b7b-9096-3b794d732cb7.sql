-- Add notes column to logbook_weeks table for workout comments
ALTER TABLE public.logbook_weeks 
ADD COLUMN notes text DEFAULT NULL;