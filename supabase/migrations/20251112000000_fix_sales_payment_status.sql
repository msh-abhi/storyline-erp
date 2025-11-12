-- Fix missing payment_status column in sales table
-- This migration ensures the payment_status column exists with proper constraints

DO $$
BEGIN
    -- Add payment_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE sales ADD COLUMN payment_status text DEFAULT 'received';
    END IF;

    -- Drop existing constraint if it exists
    ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_status_check;

    -- Add the correct constraint
    ALTER TABLE sales ADD CONSTRAINT sales_payment_status_check
    CHECK (payment_status IN ('received', 'due', 'partial'));
END $$;
