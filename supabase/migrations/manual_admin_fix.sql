-- Manual fix for admin user profile
-- Run this in your Supabase SQL editor if the migration doesn't work

-- First, check if the admin user exists in auth.users
SELECT id, email FROM auth.users WHERE email = 'TECNOMAXX.BD@GMAIL.COM';

-- Create the admin user profile
INSERT INTO public.users (id, email, is_admin)
SELECT id, email, true
FROM auth.users
WHERE email = 'TECNOMAXX.BD@GMAIL.COM'
ON CONFLICT (id) DO UPDATE SET
  is_admin = true,
  email = EXCLUDED.email,
  updated_at = NOW();

-- Verify the user profile was created
SELECT * FROM public.users WHERE email = 'TECNOMAXX.BD@GMAIL.COM';

-- Test the is_admin() function
SELECT is_admin() as is_admin_result;
