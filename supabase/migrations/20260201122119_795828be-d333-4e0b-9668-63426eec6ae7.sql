-- Add aerobic info field to training programs
ALTER TABLE public.training_programs
ADD COLUMN aerobic_info TEXT;