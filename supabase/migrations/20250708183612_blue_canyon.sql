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
-- NOTE: Only create policies for tables that have user_id column

-- Example for one table (repeat structure for others)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'user_id'
    ) THEN
        CREATE POLICY "User can access own customers"
        ON customers
        FOR ALL
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'resellers' AND column_name = 'user_id'
    ) THEN
        CREATE POLICY "User can access own resellers"
        ON resellers
        FOR ALL
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- Create policies for tables that have user_id column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales' AND column_name = 'user_id'
    ) THEN
        CREATE POLICY "User can access own sales"
        ON sales
        FOR ALL
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscriptions' AND column_name = 'user_id'
    ) THEN
        CREATE POLICY "User can access own subscriptions"
        ON subscriptions
        FOR ALL
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
END $$;
