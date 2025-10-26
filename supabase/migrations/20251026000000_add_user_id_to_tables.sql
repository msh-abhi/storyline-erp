-- Add user_id columns to tables for multi-role system
-- This migration adds user_id to customers, sales, and subscriptions tables
-- and updates RLS policies to support user-specific access

-- Add user_id to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Add user_id to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Add user_id to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Update RLS policies for customers
DROP POLICY IF EXISTS "Admin full access on customers" ON customers;
DROP POLICY IF EXISTS "Users can access their own customers" ON customers;
DROP POLICY IF EXISTS "User can access own customers" ON customers;

CREATE POLICY "Admin full access on customers" ON customers FOR ALL USING (is_admin());
CREATE POLICY "Users can access their own customers" ON customers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for sales
DROP POLICY IF EXISTS "Admin full access on sales" ON sales;
DROP POLICY IF EXISTS "Users can access their own sales" ON sales;
DROP POLICY IF EXISTS "User can access own sales" ON sales;

CREATE POLICY "Admin full access on sales" ON sales FOR ALL USING (is_admin());
CREATE POLICY "Users can access their own sales" ON sales FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for subscriptions
DROP POLICY IF EXISTS "Admin full access on subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can access their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "User can access own subscriptions" ON subscriptions;

CREATE POLICY "Admin full access on subscriptions" ON subscriptions FOR ALL USING (is_admin());
CREATE POLICY "Users can access their own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
