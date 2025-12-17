-- Revert username column back to server_id in customer_credentials table
-- This migration reverts the change made in 20251202000000_rename_server_id_to_username.sql
-- to fix compatibility with frontend code that still uses server_id

-- First, let's check if username column exists before reverting it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'customer_credentials' 
        AND column_name = 'username'
    ) THEN
        -- Rename column back to server_id
        ALTER TABLE customer_credentials RENAME COLUMN username TO server_id;
        
        -- Update the comment to reflect the reversion
        COMMENT ON COLUMN customer_credentials.server_id IS 'Server ID for IPTV credentials (reverted from username)';
        
        RAISE NOTICE 'Column username reverted to server_id in customer_credentials table';
    ELSE
        RAISE NOTICE 'Column username does not exist in customer_credentials table (server_id already exists)';
    END IF;
END $$;

-- Update any views that might reference the username column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.views 
        WHERE table_name = 'customer_credentials_view'
    ) THEN
        -- Drop and recreate the view with the original column name
        DROP VIEW IF EXISTS customer_credentials_view;
        
        CREATE OR REPLACE VIEW customer_credentials_view AS
        SELECT 
            id,
            customer_id,
            server_url,
            server_id,
            password,
            mac_address,
            expires_at,
            notes,
            created_at,
            updated_at
        FROM customer_credentials;
        
        RAISE NOTICE 'customer_credentials_view reverted to use server_id column';
    END IF;
END $$;

-- Update any RLS policies that might reference the username column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'customer_credentials' 
        AND qual LIKE '%username%'
    ) THEN
        -- Drop existing policies that reference username
        DROP POLICY IF EXISTS "Users can view their own credentials" ON customer_credentials;
        DROP POLICY IF EXISTS "Users can insert their own credentials" ON customer_credentials;
        DROP POLICY IF EXISTS "Users can update their own credentials" ON customer_credentials;
        DROP POLICY IF EXISTS "Users can delete their own credentials" ON customer_credentials;
        DROP POLICY IF EXISTS "Admins can view all credentials" ON customer_credentials;
        DROP POLICY IF EXISTS "Admins can manage all credentials" ON customer_credentials;
        
        -- Recreate policies with the original server_id column name
        CREATE POLICY "Users can view their own credentials" ON customer_credentials
            FOR SELECT USING (
                auth.uid() = customer_id OR
                EXISTS (
                    SELECT 1 FROM customer_portal_users cpu 
                    WHERE cpu.auth_provider_id = auth.uid() 
                    AND cpu.customer_id = customer_credentials.customer_id
                )
            );
            
        CREATE POLICY "Users can insert their own credentials" ON customer_credentials
            FOR INSERT WITH CHECK (
                auth.uid() = customer_id OR
                EXISTS (
                    SELECT 1 FROM customer_portal_users cpu 
                    WHERE cpu.auth_provider_id = auth.uid() 
                    AND cpu.customer_id = customer_credentials.customer_id
                )
            );
            
        CREATE POLICY "Users can update their own credentials" ON customer_credentials
            FOR UPDATE USING (
                auth.uid() = customer_id OR
                EXISTS (
                    SELECT 1 FROM customer_portal_users cpu 
                    WHERE cpu.auth_provider_id = auth.uid() 
                    AND cpu.customer_id = customer_credentials.customer_id
                )
            );
            
        CREATE POLICY "Users can delete their own credentials" ON customer_credentials
            FOR DELETE USING (
                auth.uid() = customer_id OR
                EXISTS (
                    SELECT 1 FROM customer_portal_users cpu 
                    WHERE cpu.auth_provider_id = auth.uid() 
                    AND cpu.customer_id = customer_credentials.customer_id
                )
            );
            
        CREATE POLICY "Admins can view all credentials" ON customer_credentials
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_profiles.id = auth.uid() 
                    AND user_profiles.is_admin = true
                )
            );
            
        CREATE POLICY "Admins can manage all credentials" ON customer_credentials
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_profiles.id = auth.uid() 
                    AND user_profiles.is_admin = true
                )
            );
            
        RAISE NOTICE 'RLS policies reverted to use server_id column';
    END IF;
END $$;

-- Ensure the original working RLS policies from migration 20251128000001_fix_customer_credentials_rls.sql are still in place
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

-- Keep the admin policy for full management
DROP POLICY IF EXISTS "Admins can manage all credentials." ON customer_credentials;
CREATE POLICY "Admins can manage all credentials."
ON customer_credentials FOR ALL
USING (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.is_admin = TRUE));

-- Add a comment to track this migration
COMMENT ON TABLE customer_credentials IS 'Reverted to server_id column (from username) on 2025-12-17 to fix frontend compatibility';
