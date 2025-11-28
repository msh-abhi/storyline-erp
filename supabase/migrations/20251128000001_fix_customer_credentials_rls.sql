-- Fix customer_credentials RLS policies to allow authenticated users to create credentials

-- Allow authenticated users to insert credentials for any customer
DROP POLICY IF EXISTS "Authenticated users can create credentials." ON customer_credentials;
CREATE POLICY "Authenticated users can create credentials."
ON customer_credentials FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update credentials (previously only admins could update)
DROP POLICY IF EXISTS "Authenticated users can update credentials." ON customer_credentials;
CREATE POLICY "Authenticated users can update credentials."
ON customer_credentials FOR UPDATE
USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete credentials (previously only admins could delete)
DROP POLICY IF EXISTS "Authenticated users can delete credentials." ON customer_credentials;
CREATE POLICY "Authenticated users can delete credentials."
ON customer_credentials FOR DELETE
USING (auth.role() = 'authenticated');

-- Keep admin policy for full management
DROP POLICY IF EXISTS "Admins can manage all credentials." ON customer_credentials;
CREATE POLICY "Admins can manage all credentials."
ON customer_credentials FOR ALL
USING (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.is_admin = TRUE));
