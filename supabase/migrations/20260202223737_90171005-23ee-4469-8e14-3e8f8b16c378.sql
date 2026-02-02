-- Add diet_url column to students table
ALTER TABLE public.students ADD COLUMN diet_url TEXT;

-- Create storage bucket for diets
INSERT INTO storage.buckets (id, name, public)
VALUES ('diets', 'diets', true);

-- Policy: Admins can upload and delete diet files
CREATE POLICY "Admins can manage diet files"
ON storage.objects
FOR ALL
USING (bucket_id = 'diets' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'diets' AND has_role(auth.uid(), 'admin'::app_role));

-- Policy: Anyone authenticated can view diet files
CREATE POLICY "Authenticated users can view diet files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'diets' AND auth.uid() IS NOT NULL);