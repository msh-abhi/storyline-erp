-- Add INSERT policy for customer_portal_users table
-- This allows authenticated users to create their own portal user entry

DROP POLICY IF EXISTS "Customers can insert their own portal user entry." ON customer_portal_users;
CREATE POLICY "Customers can insert their own portal user entry."
ON customer_portal_users FOR INSERT
WITH CHECK (auth_provider_id = auth.uid());
