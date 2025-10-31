-- Enable Row-Level Security on all tables
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

-- Drop old policies (if any)
DROP POLICY IF EXISTS "Allow all operations on customers" ON customers;
DROP POLICY IF EXISTS "Allow all operations on resellers" ON resellers;
DROP POLICY IF EXISTS "Allow all operations on suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow all operations on digital_codes" ON digital_codes;
DROP POLICY IF EXISTS "Allow all operations on tv_boxes" ON tv_boxes;
DROP POLICY IF EXISTS "Allow all operations on sales" ON sales;
DROP POLICY IF EXISTS "Allow all operations on purchases" ON purchases;
DROP POLICY IF EXISTS "Allow all operations on email_templates" ON email_templates;
DROP POLICY IF EXISTS "Allow all operations on supplier_credits" ON supplier_credits;
DROP POLICY IF EXISTS "Allow all operations on credit_sales" ON credit_sales;
DROP POLICY IF EXISTS "Allow all operations on subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Allow all operations on subscription_products" ON subscription_products;
DROP POLICY IF EXISTS "Allow all operations on reseller_credits" ON reseller_credits;
DROP POLICY IF EXISTS "Allow all operations on settings" ON settings;
DROP POLICY IF EXISTS "Allow all operations on activity_logs" ON activity_logs;

-- Create policies: any authenticated user has full access
DROP POLICY IF EXISTS "Authenticated can access customers" ON customers;
CREATE POLICY "Authenticated can access customers" ON customers FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can access resellers" ON resellers;
CREATE POLICY "Authenticated can access resellers" ON resellers FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can access suppliers" ON suppliers;
CREATE POLICY "Authenticated can access suppliers" ON suppliers FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can access digital_codes" ON digital_codes;
CREATE POLICY "Authenticated can access digital_codes" ON digital_codes FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can access tv_boxes" ON tv_boxes;
CREATE POLICY "Authenticated can access tv_boxes" ON tv_boxes FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can access sales" ON sales;
CREATE POLICY "Authenticated can access sales" ON sales FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can access purchases" ON purchases;
CREATE POLICY "Authenticated can access purchases" ON purchases FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can access email_templates" ON email_templates;
CREATE POLICY "Authenticated can access email_templates" ON email_templates FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can access supplier_credits" ON supplier_credits;
CREATE POLICY "Authenticated can access supplier_credits" ON supplier_credits FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can access credit_sales" ON credit_sales;
CREATE POLICY "Authenticated can access credit_sales" ON credit_sales FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can access subscriptions" ON subscriptions;
CREATE POLICY "Authenticated can access subscriptions" ON subscriptions FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can access subscription_products" ON subscription_products;
CREATE POLICY "Authenticated can access subscription_products" ON subscription_products FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can access reseller_credits" ON reseller_credits;
CREATE POLICY "Authenticated can access reseller_credits" ON reseller_credits FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can access settings" ON settings;
CREATE POLICY "Authenticated can access settings" ON settings FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can access activity_logs" ON activity_logs;
CREATE POLICY "Authenticated can access activity_logs" ON activity_logs FOR ALL TO authenticated USING (true);

-- Optional: Turn off email confirmation for easy access
-- UPDATE auth.config SET email_confirm = false WHERE id = 1;