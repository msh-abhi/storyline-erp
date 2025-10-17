/*
  # Fix Database Schema Issues

  1. Add missing created_at columns
  2. Fix column naming inconsistencies
  3. Update constraints to match application expectations
  4. Ensure all tables have proper structure
*/

-- Add missing created_at columns where needed
DO $$
BEGIN
  -- Add created_at to purchases if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchases' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE purchases ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  -- Add created_at to email_templates if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  -- Add created_at to sales if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE sales ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  -- Add created_at to digital_codes if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'digital_codes' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE digital_codes ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  -- Add created_at to tv_boxes if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tv_boxes' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE tv_boxes ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Update existing records to have created_at values
UPDATE purchases SET created_at = purchase_date WHERE created_at IS NULL;
UPDATE sales SET created_at = sale_date WHERE created_at IS NULL;
UPDATE digital_codes SET created_at = now() WHERE created_at IS NULL;
UPDATE tv_boxes SET created_at = now() WHERE created_at IS NULL;
UPDATE email_templates SET created_at = now() WHERE created_at IS NULL;

-- Make supplier_id NOT NULL in purchases table and add proper foreign key
UPDATE purchases SET supplier_id = (
  SELECT id FROM suppliers LIMIT 1
) WHERE supplier_id IS NULL;

-- Drop existing foreign key constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchases_supplier_id_fkey' 
    AND table_name = 'purchases'
  ) THEN
    ALTER TABLE purchases DROP CONSTRAINT purchases_supplier_id_fkey;
  END IF;
END $$;

-- Make supplier_id NOT NULL and add foreign key constraint
ALTER TABLE purchases ALTER COLUMN supplier_id SET NOT NULL;
ALTER TABLE purchases ADD CONSTRAINT purchases_supplier_id_fkey 
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE;

-- Ensure all tables have proper indexes
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_digital_codes_created_at ON digital_codes(created_at);
CREATE INDEX IF NOT EXISTS idx_tv_boxes_created_at ON tv_boxes(created_at);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_at ON email_templates(created_at);

-- Update RLS policies to ensure they work correctly
DROP POLICY IF EXISTS "Allow all operations on purchases" ON purchases;
DROP POLICY IF EXISTS "Allow all operations on sales" ON sales;
DROP POLICY IF EXISTS "Allow all operations on digital_codes" ON digital_codes;
DROP POLICY IF EXISTS "Allow all operations on tv_boxes" ON tv_boxes;
DROP POLICY IF EXISTS "Allow all operations on email_templates" ON email_templates;

CREATE POLICY "Allow all operations on purchases" ON purchases FOR ALL USING (true);
CREATE POLICY "Allow all operations on sales" ON sales FOR ALL USING (true);
CREATE POLICY "Allow all operations on digital_codes" ON digital_codes FOR ALL USING (true);
CREATE POLICY "Allow all operations on tv_boxes" ON tv_boxes FOR ALL USING (true);
CREATE POLICY "Allow all operations on email_templates" ON email_templates FOR ALL USING (true);