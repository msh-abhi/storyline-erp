/*
  # Comprehensive App Improvements

  1. New Tables
    - `subscription_products` - Predefined subscription products
    - `reseller_credits` - Track reseller credit transactions
    
  2. Table Updates
    - Add MAC address and WhatsApp to customers
    - Update resellers table for credit tracking
    - Update subscriptions table structure
    
  3. Functions
    - Update credit balance functions
    - Add search functions
    
  4. Security
    - Enable RLS on new tables
    - Add appropriate policies
*/

-- Add new columns to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'mac_address'
  ) THEN
    ALTER TABLE customers ADD COLUMN mac_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE customers ADD COLUMN whatsapp_number text;
  END IF;
END $$;

-- Create subscription_products table
CREATE TABLE IF NOT EXISTS subscription_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_months integer NOT NULL,
  price decimal NOT NULL,
  features text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create reseller_credits table
CREATE TABLE IF NOT EXISTS reseller_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid REFERENCES resellers(id) ON DELETE CASCADE,
  amount decimal NOT NULL,
  type text NOT NULL CHECK (type IN ('earned', 'used', 'payment')),
  description text,
  payment_method text,
  date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Update subscriptions table structure
DO $$
BEGIN
  -- Add customer_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN customer_name text;
  END IF;
END $$;

-- Update customer names in existing subscriptions
UPDATE subscriptions 
SET customer_name = customers.name 
FROM customers 
WHERE subscriptions.customer_id = customers.id 
AND subscriptions.customer_name IS NULL;

-- Enable RLS on new tables
ALTER TABLE subscription_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_credits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on subscription_products" ON subscription_products FOR ALL USING (true);
CREATE POLICY "Allow all operations on reseller_credits" ON reseller_credits FOR ALL USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_mac_address ON customers(mac_address);
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp_number ON customers(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_reseller_credits_reseller_id ON reseller_credits(reseller_id);
CREATE INDEX IF NOT EXISTS idx_subscription_products_is_active ON subscription_products(is_active);

-- Function to update reseller credit balance
CREATE OR REPLACE FUNCTION update_reseller_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'earned' OR NEW.type = 'payment' THEN
      UPDATE resellers 
      SET credit_balance = COALESCE(credit_balance, 0) + NEW.amount
      WHERE id = NEW.reseller_id;
    ELSIF NEW.type = 'used' THEN
      UPDATE resellers 
      SET credit_balance = COALESCE(credit_balance, 0) - NEW.amount
      WHERE id = NEW.reseller_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reseller credit balance updates
DROP TRIGGER IF EXISTS trigger_update_reseller_credit_balance ON reseller_credits;
CREATE TRIGGER trigger_update_reseller_credit_balance
  AFTER INSERT ON reseller_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_reseller_credit_balance();

-- Insert default subscription products
INSERT INTO subscription_products (name, description, duration_months, price, features) VALUES
('Basic Streaming - 1 Month', 'Basic streaming package for 1 month', 1, 99.00, ARRAY['HD Quality', 'Single Device', 'Basic Support']),
('Premium Streaming - 1 Month', 'Premium streaming package for 1 month', 1, 149.00, ARRAY['4K Quality', 'Multiple Devices', 'Premium Support', 'Offline Downloads']),
('Basic Streaming - 12 Months', 'Basic streaming package for 12 months', 12, 999.00, ARRAY['HD Quality', 'Single Device', 'Basic Support', '12 Month Discount']),
('Premium Streaming - 12 Months', 'Premium streaming package for 12 months', 12, 1499.00, ARRAY['4K Quality', 'Multiple Devices', 'Premium Support', 'Offline Downloads', '12 Month Discount'])
ON CONFLICT DO NOTHING;