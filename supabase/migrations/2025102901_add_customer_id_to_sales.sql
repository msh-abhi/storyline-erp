-- Add customer_id column to sales table
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS customer_id uuid;

-- Add foreign key constraint to link with the customers table
ALTER TABLE public.sales
DROP CONSTRAINT IF EXISTS fk_customer,
ADD CONSTRAINT fk_customer
FOREIGN KEY (customer_id)
REFERENCES public.customers(id)
ON DELETE SET NULL;