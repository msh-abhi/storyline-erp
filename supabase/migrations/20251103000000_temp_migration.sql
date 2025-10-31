-- Migration to enhance the sales table for invoicing and profit tracking.

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS total_price decimal,
ADD COLUMN IF NOT EXISTS profit decimal,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS invoice_id uuid;

-- Add foreign key to invoices table.
-- This assumes the invoices table exists and has a uuid id column.
-- We add it separately to avoid errors if the column already exists.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sales_invoice_id_fkey' AND conrelid = 'public.sales'::regclass
    ) THEN
        ALTER TABLE public.sales 
        ADD CONSTRAINT sales_invoice_id_fkey 
        FOREIGN KEY (invoice_id) 
        REFERENCES public.invoices(id) 
        ON DELETE SET NULL;
    END IF;
END;
$$;

-- Update the possible values for the 'status' column to align with invoice statuses
-- First, remove the old constraint if it exists
ALTER TABLE public.sales
DROP CONSTRAINT IF EXISTS sales_status_check;

-- Then, add the new constraint with the updated values
ALTER TABLE public.sales
ADD CONSTRAINT sales_status_check CHECK (status IN ('completed', 'pending', 'cancelled', 'refunded'));

-- We are also removing the 'payment_status' column as its role is now fulfilled by the 'status' on the linked invoice.
-- To be safe, we'll only remove it if it exists.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE public.sales DROP COLUMN payment_status;
    END IF;
END;
$$;