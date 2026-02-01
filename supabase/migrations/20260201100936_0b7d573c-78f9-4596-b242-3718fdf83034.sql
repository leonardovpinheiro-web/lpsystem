-- Allow training_programs to have null student_id (for templates)
ALTER TABLE public.training_programs 
ALTER COLUMN student_id DROP NOT NULL;

-- Add is_template column to identify template programs
ALTER TABLE public.training_programs 
ADD COLUMN is_template boolean NOT NULL DEFAULT false;

-- Update RLS policy to allow admins to manage templates
DROP POLICY IF EXISTS "Admins can manage programs" ON public.training_programs;
CREATE POLICY "Admins can manage programs" 
ON public.training_programs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Students can only view their own programs (not templates)
DROP POLICY IF EXISTS "Students can view their programs" ON public.training_programs;
CREATE POLICY "Students can view their programs" 
ON public.training_programs 
FOR SELECT 
USING (student_id = get_student_id(auth.uid()) AND is_template = false);