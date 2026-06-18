DROP POLICY "users manage own progress" ON public.video_progress;
CREATE POLICY "users manage own progress" ON public.video_progress
AS PERMISSIVE FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));