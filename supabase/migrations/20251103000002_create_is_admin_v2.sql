CREATE OR REPLACE FUNCTION is_admin_v2()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.is_admin
  );
$$ LANGUAGE sql SECURITY DEFINER;