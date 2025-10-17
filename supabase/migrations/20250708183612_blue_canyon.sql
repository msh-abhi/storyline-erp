-- Enable RLS for all relevant tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop any existing public policies
-- (You can keep this block if it's part of your original migration)
DROP POLICY IF EXISTS "Allow all operations on customers" ON customers;
-- Repeat for all other tables...

-- Now, add secure per-user policies
-- NOTE: Assumes each table has a user_id UUID column

-- Example for one table (repeat structure for others)
CREATE POLICY "User can access own customers" 
ON customers 
FOR ALL 
TO authenticated 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "User can access own resellers"
ON resellers 
FOR ALL 
TO authenticated 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- ...repeat for the remaining tables
-- For brevity, here’s a batch template:

-- Template for all tables
DO $$ 
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'suppliers', 'digital_codes', 'tv_boxes', 'sales', 'purchases', 
            'email_templates', 'supplier_credits', 'credit_sales',
            'subscriptions', 'subscription_products', 'reseller_credits',
            'settings', 'activity_logs'
        ])
    LOOP
        EXECUTE format('
            CREATE POLICY "User can access own %I"
            ON %I 
            FOR ALL 
            TO authenticated 
            USING (user_id = auth.uid()) 
            WITH CHECK (user_id = auth.uid());
        ', tbl, tbl);
    END LOOP;
END $$;

-- Disable email confirmation for ease of dev (optional, security trade-off)
UPDATE auth.config SET email_confirm = false WHERE id = 1;
