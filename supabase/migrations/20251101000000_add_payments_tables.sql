-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL, -- Optional link to invoice
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  reseller_id uuid REFERENCES resellers(id) ON DELETE CASCADE,
  amount decimal NOT NULL,
  currency text NOT NULL,
  payment_date timestamptz DEFAULT now(),
  method text NOT NULL, -- e.g., 'bank_transfer', 'cash', 'mobilepay'
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES payments(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  amount decimal NOT NULL,
  currency text NOT NULL,
  description text,
  transaction_date timestamptz DEFAULT now(),
  status text DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  gateway_response jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for new tables
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for payments
CREATE POLICY "Allow all operations on payments for authenticated users"
ON payments FOR ALL
USING (auth.role() = 'authenticated');

-- Policies for payment_transactions
CREATE POLICY "Allow all operations on payment_transactions for authenticated users"
ON payment_transactions FOR ALL
USING (auth.role() = 'authenticated');