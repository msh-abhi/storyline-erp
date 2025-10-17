/*
  # Comprehensive System Fixes and Improvements

  1. New Tables
    - `activity_logs` - System activity tracking
    
  2. Table Updates
    - Update sales table to support subscriptions
    - Add payment tracking fields
    - Update reseller credits structure
    
  3. Functions
    - Activity logging functions
    - Calculation updates
    
  4. Security
    - Enable RLS on new tables
    - Add appropriate policies
*/

-- Create activity_logs table for system tracking
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text DEFAULT 'admin',
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Update sales table to support subscriptions
DO $$
BEGIN
  -- Add payment_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE sales ADD COLUMN payment_status text DEFAULT 'received' CHECK (payment_status IN ('received', 'due', 'partial'));
  END IF;

  -- Update product_type constraint to include subscription
  ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_product_type_check;
  ALTER TABLE sales ADD CONSTRAINT sales_product_type_check 
    CHECK (product_type IN ('digital_code', 'tv_box', 'subscription'));
END $$;

-- Update reseller_credits table structure
DO $$
BEGIN
  -- Add sale_amount column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reseller_credits' AND column_name = 'sale_amount'
  ) THEN
    ALTER TABLE reseller_credits ADD COLUMN sale_amount decimal DEFAULT 0;
  END IF;
END $$;

-- Enable RLS on activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on activity_logs" ON activity_logs FOR ALL USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_id ON activity_logs(entity_id);

-- Function to log activities
CREATE OR REPLACE FUNCTION log_activity(
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_entity_name text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO activity_logs (action, entity_type, entity_id, entity_name, details)
  VALUES (p_action, p_entity_type, p_entity_id, p_entity_name, p_details);
END;
$$ LANGUAGE plpgsql;

-- Update reseller credit balance function to handle sale amounts
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
    
    -- Log the activity
    PERFORM log_activity(
      'credit_' || NEW.type,
      'reseller_credit',
      NEW.id,
      (SELECT name FROM resellers WHERE id = NEW.reseller_id),
      jsonb_build_object('amount', NEW.amount, 'type', NEW.type, 'sale_amount', NEW.sale_amount)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sales activity logging
CREATE OR REPLACE FUNCTION log_sales_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      'sale_created',
      'sale',
      NEW.id,
      NEW.product_name,
      jsonb_build_object(
        'buyer_name', NEW.buyer_name,
        'total_amount', NEW.total_amount,
        'profit', NEW.profit,
        'payment_status', NEW.payment_status
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      'sale_updated',
      'sale',
      NEW.id,
      NEW.product_name,
      jsonb_build_object(
        'buyer_name', NEW.buyer_name,
        'total_amount', NEW.total_amount,
        'profit', NEW.profit,
        'payment_status', NEW.payment_status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sales logging
DROP TRIGGER IF EXISTS trigger_log_sales_activity ON sales;
CREATE TRIGGER trigger_log_sales_activity
  AFTER INSERT OR UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION log_sales_activity();

-- Create trigger for subscription logging
CREATE OR REPLACE FUNCTION log_subscription_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      'subscription_created',
      'subscription',
      NEW.id,
      NEW.product_name,
      jsonb_build_object(
        'customer_name', NEW.customer_name,
        'price', NEW.price,
        'duration_months', NEW.duration_months,
        'end_date', NEW.end_date
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      'subscription_updated',
      'subscription',
      NEW.id,
      NEW.product_name,
      jsonb_build_object(
        'customer_name', NEW.customer_name,
        'status', NEW.status,
        'reminder_7_sent', NEW.reminder_7_sent,
        'reminder_3_sent', NEW.reminder_3_sent
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription logging
DROP TRIGGER IF EXISTS trigger_log_subscription_activity ON subscriptions;
CREATE TRIGGER trigger_log_subscription_activity
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION log_subscription_activity();