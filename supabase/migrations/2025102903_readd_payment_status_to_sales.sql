-- Add payment_status column back to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';

-- Optional: Add a check constraint for valid values
ALTER TABLE sales 
DROP CONSTRAINT IF EXISTS sales_payment_status_check,
ADD CONSTRAINT sales_payment_status_check 
CHECK (payment_status IN ('paid', 'unpaid', 'partial', 'refunded'));