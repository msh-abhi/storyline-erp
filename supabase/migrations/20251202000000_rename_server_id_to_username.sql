-- Rename server_id column to username in customer_credentials table
-- This migration changes the field name from server_id to username to better reflect its purpose

-- First, let's check if the column exists before renaming it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'customer_credentials' 
        AND column_name = 'server_id'
    ) THEN
        -- Rename the column
        ALTER TABLE customer_credentials RENAME COLUMN server_id TO username;
        
        -- Add a comment to explain the change
        COMMENT ON COLUMN customer_credentials.username IS 'Username for IPTV credentials (previously named server_id)';
        
        RAISE NOTICE 'Column server_id renamed to username in customer_credentials table';
    ELSE
        RAISE NOTICE 'Column server_id does not exist in customer_credentials table';
    END IF;
END $$;

-- Update any views that might reference the old column name
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.views 
        WHERE table_name = 'customer_credentials_view'
    ) THEN
        -- Drop and recreate the view with the new column name
        DROP VIEW IF EXISTS customer_credentials_view;
        
        CREATE OR REPLACE VIEW customer_credentials_view AS
        SELECT 
            id,
            customer_id,
            server_url,
            username,
            password,
            mac_address,
            expires_at,
            notes,
            created_at,
            updated_at
        FROM customer_credentials;
        
        RAISE NOTICE 'customer_credentials_view updated to use username column';
    END IF;
END $$;

-- Update any RLS policies that might reference the old column name
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'customer_credentials' 
        AND qual LIKE '%server_id%'
    ) THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view their own credentials" ON customer_credentials;
        DROP POLICY IF EXISTS "Users can insert their own credentials" ON customer_credentials;
        DROP POLICY IF EXISTS "Users can update their own credentials" ON customer_credentials;
        DROP POLICY IF EXISTS "Users can delete their own credentials" ON customer_credentials;
        DROP POLICY IF EXISTS "Admins can view all credentials" ON customer_credentials;
        DROP POLICY IF EXISTS "Admins can manage all credentials" ON customer_credentials;
        
        -- Recreate policies with the new column name
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
            
        RAISE NOTICE 'RLS policies updated to use username column';
    END IF;
END $$;

-- Add a comment to track this migration
COMMENT ON TABLE customer_credentials IS 'Updated with username column (renamed from server_id) on 2025-12-02';