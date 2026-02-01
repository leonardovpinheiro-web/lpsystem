-- Create table for weekly logbook blocks
CREATE TABLE public.logbook_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, workout_id, week_number)
);

-- Create table for logbook entries (one row per exercise, with 4 fixed sets)
CREATE TABLE public.logbook_week_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES public.logbook_weeks(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  exercise_order INTEGER NOT NULL,
  original_exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  set1_weight NUMERIC,
  set1_reps INTEGER,
  set2_weight NUMERIC,
  set2_reps INTEGER,
  set3_weight NUMERIC,
  set3_reps INTEGER,
  set4_weight NUMERIC,
  set4_reps INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.logbook_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logbook_week_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for logbook_weeks
CREATE POLICY "Admins can manage all logbook weeks"
  ON public.logbook_weeks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can manage their own logbook weeks"
  ON public.logbook_weeks FOR ALL
  USING (student_id = get_student_id(auth.uid()));

-- RLS policies for logbook_week_entries
CREATE POLICY "Admins can manage all logbook entries"
  ON public.logbook_week_entries FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can manage their own logbook entries"
  ON public.logbook_week_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.logbook_weeks lw
      WHERE lw.id = logbook_week_entries.week_id
      AND lw.student_id = get_student_id(auth.uid())
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_logbook_week_entries_updated_at
  BEFORE UPDATE ON public.logbook_week_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();