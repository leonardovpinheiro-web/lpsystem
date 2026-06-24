-- Public read access for the demo program only
CREATE POLICY "Public can read demo program"
ON public.training_programs
FOR SELECT
TO anon
USING (id = '8b97d96b-c0b7-4afb-94f5-8027ee3428ab'::uuid);

CREATE POLICY "Public can read demo program workouts"
ON public.workouts
FOR SELECT
TO anon
USING (program_id = '8b97d96b-c0b7-4afb-94f5-8027ee3428ab'::uuid);

CREATE POLICY "Public can read demo program exercises"
ON public.exercises
FOR SELECT
TO anon
USING (workout_id IN (
  SELECT id FROM public.workouts WHERE program_id = '8b97d96b-c0b7-4afb-94f5-8027ee3428ab'::uuid
));

GRANT SELECT ON public.training_programs TO anon;
GRANT SELECT ON public.workouts TO anon;
GRANT SELECT ON public.exercises TO anon;