ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
UPDATE public.profiles SET onboarding_completed_at = now() WHERE onboarding_completed_at IS NULL;