-- Create exercise library table for autocomplete suggestions
CREATE TABLE public.exercise_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view the exercise library
CREATE POLICY "Anyone authenticated can view exercise library"
ON public.exercise_library
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can manage the exercise library
CREATE POLICY "Admins can manage exercise library"
ON public.exercise_library
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add video_url column to exercises table
ALTER TABLE public.exercises ADD COLUMN video_url TEXT;

-- Create trigger for updated_at
CREATE TRIGGER update_exercise_library_updated_at
BEFORE UPDATE ON public.exercise_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();