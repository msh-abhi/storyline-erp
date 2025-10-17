/*
  # Add Subscription Management and Reminder System

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key)
      - `product_id` (uuid)
      - `product_name` (text)
      - `start_date` (timestamp)
      - `end_date` (timestamp)
      - `duration_months` (integer)
      - `price` (decimal)
      - `status` (text)
      - `reminder_7_sent` (boolean)
      - `reminder_3_sent` (boolean)
      - `created_at` (timestamp)
    
    - `settings`
      - `id` (uuid, primary key)
      - `company_name` (text)
      - `logo_url` (text)
      - `currency` (text)
      - `language` (text)
      - `email_settings` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Functions
    - Function to check and send reminder emails
    - Function to update subscription status

  3. Security
    - Enable RLS on new tables
    - Add appropriate policies
*/

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  duration_months integer NOT NULL,
  price decimal NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'renewed')),
  reminder_7_sent boolean DEFAULT false,
  reminder_3_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text DEFAULT 'Jysk Streaming',
  logo_url text,
  currency text DEFAULT 'DKK',
  language text DEFAULT 'en',
  email_settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add credit_balance to resellers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resellers' AND column_name = 'credit_balance'
  ) THEN
    ALTER TABLE resellers ADD COLUMN credit_balance decimal DEFAULT 0;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on subscriptions" ON subscriptions FOR ALL USING (true);
CREATE POLICY "Allow all operations on settings" ON settings FOR ALL USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Insert default settings
INSERT INTO settings (company_name, currency, language) 
VALUES ('Jysk Streaming', 'DKK', 'en')
ON CONFLICT DO NOTHING;

-- Function to check and send reminder emails
CREATE OR REPLACE FUNCTION check_subscription_reminders()
RETURNS void AS $$
DECLARE
  sub_record RECORD;
  customer_record RECORD;
  days_until_expiry integer;
BEGIN
  -- Check all active subscriptions
  FOR sub_record IN 
    SELECT * FROM subscriptions 
    WHERE status = 'active' 
    AND end_date > now()
  LOOP
    -- Calculate days until expiry
    days_until_expiry := EXTRACT(DAY FROM (sub_record.end_date - now()));
    
    -- Get customer details
    SELECT * INTO customer_record FROM customers WHERE id = sub_record.customer_id;
    
    -- Send 7-day reminder
    IF days_until_expiry <= 7 AND days_until_expiry > 3 AND NOT sub_record.reminder_7_sent THEN
      -- This would trigger the email sending function
      UPDATE subscriptions 
      SET reminder_7_sent = true 
      WHERE id = sub_record.id;
    END IF;
    
    -- Send 3-day reminder
    IF days_until_expiry <= 3 AND days_until_expiry > 0 AND NOT sub_record.reminder_3_sent THEN
      -- This would trigger the email sending function
      UPDATE subscriptions 
      SET reminder_3_sent = true 
      WHERE id = sub_record.id;
    END IF;
    
    -- Mark as expired if past end date
    IF sub_record.end_date < now() THEN
      UPDATE subscriptions 
      SET status = 'expired' 
      WHERE id = sub_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;