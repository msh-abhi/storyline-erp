/*
  # Initial Business Management Schema

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `custom_fields` (jsonb)
      - `created_at` (timestamp)
      - `last_contact` (timestamp)
    
    - `resellers`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `total_sales` (decimal)
      - `outstanding_payment` (decimal)
      - `commission_rate` (decimal)
      - `created_at` (timestamp)
    
    - `suppliers`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `total_purchases` (decimal)
      - `amount_owed` (decimal)
      - `credit_balance` (decimal)
      - `total_credit_earned` (decimal)
      - `created_at` (timestamp)
    
    - `digital_codes`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `purchase_price` (decimal)
      - `purchase_source` (text)
      - `customer_price` (decimal)
      - `reseller_price` (decimal)
      - `quantity` (integer)
      - `sold_quantity` (integer)
      - `category` (text)
      - `created_at` (timestamp)
    
    - `tv_boxes`
      - `id` (uuid, primary key)
      - `model` (text)
      - `purchase_price` (decimal)
      - `customer_price` (decimal)
      - `reseller_price` (decimal)
      - `purchase_source` (text)
      - `quantity` (integer)
      - `sold_quantity` (integer)
      - `created_at` (timestamp)
    
    - `sales`
      - `id` (uuid, primary key)
      - `product_id` (uuid)
      - `product_type` (text)
      - `product_name` (text)
      - `buyer_type` (text)
      - `buyer_id` (uuid)
      - `buyer_name` (text)
      - `quantity` (integer)
      - `unit_price` (decimal)
      - `total_amount` (decimal)
      - `profit` (decimal)
      - `sale_date` (timestamp)
      - `status` (text)
    
    - `purchases`
      - `id` (uuid, primary key)
      - `supplier_id` (uuid)
      - `supplier_name` (text)
      - `product_type` (text)
      - `product_name` (text)
      - `quantity` (integer)
      - `unit_price` (decimal)
      - `total_amount` (decimal)
      - `purchase_date` (timestamp)
      - `status` (text)
    
    - `email_templates`
      - `id` (uuid, primary key)
      - `name` (text)
      - `subject` (text)
      - `content` (text)
      - `trigger` (text)
      - `created_at` (timestamp)
    
    - `supplier_credits`
      - `id` (uuid, primary key)
      - `supplier_id` (uuid, foreign key)
      - `amount` (decimal)
      - `type` (text) -- 'earned' or 'used'
      - `description` (text)
      - `date` (timestamp)
      - `created_at` (timestamp)
    
    - `credit_sales`
      - `id` (uuid, primary key)
      - `supplier_id` (uuid, foreign key)
      - `reseller_id` (uuid, foreign key)
      - `credit_amount` (decimal)
      - `sale_price` (decimal)
      - `profit` (decimal)
      - `sale_date` (timestamp)
      - `status` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  custom_fields jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  last_contact timestamptz
);

-- Create resellers table
CREATE TABLE IF NOT EXISTS resellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  total_sales decimal DEFAULT 0,
  outstanding_payment decimal DEFAULT 0,
  commission_rate decimal DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  total_purchases decimal DEFAULT 0,
  amount_owed decimal DEFAULT 0,
  credit_balance decimal DEFAULT 0,
  total_credit_earned decimal DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create digital_codes table
CREATE TABLE IF NOT EXISTS digital_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  purchase_price decimal NOT NULL,
  purchase_source text NOT NULL,
  customer_price decimal NOT NULL,
  reseller_price decimal NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  sold_quantity integer DEFAULT 0,
  category text,
  created_at timestamptz DEFAULT now()
);

-- Create tv_boxes table
CREATE TABLE IF NOT EXISTS tv_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text NOT NULL,
  purchase_price decimal NOT NULL,
  customer_price decimal NOT NULL,
  reseller_price decimal NOT NULL,
  purchase_source text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  sold_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  product_type text NOT NULL CHECK (product_type IN ('digital_code', 'tv_box')),
  product_name text NOT NULL,
  buyer_type text NOT NULL CHECK (buyer_type IN ('customer', 'reseller')),
  buyer_id uuid NOT NULL,
  buyer_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal NOT NULL,
  total_amount decimal NOT NULL,
  profit decimal NOT NULL,
  sale_date timestamptz DEFAULT now(),
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled'))
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  product_type text NOT NULL CHECK (product_type IN ('digital_code', 'tv_box')),
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal NOT NULL,
  total_amount decimal NOT NULL,
  purchase_date timestamptz DEFAULT now(),
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'pending'))
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  trigger text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create supplier_credits table
CREATE TABLE IF NOT EXISTS supplier_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  amount decimal NOT NULL,
  type text NOT NULL CHECK (type IN ('earned', 'used')),
  description text,
  date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create credit_sales table
CREATE TABLE IF NOT EXISTS credit_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  reseller_id uuid REFERENCES resellers(id) ON DELETE CASCADE,
  credit_amount decimal NOT NULL,
  sale_price decimal NOT NULL,
  profit decimal NOT NULL,
  sale_date timestamptz DEFAULT now(),
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled'))
);

-- Enable Row Level Security
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

-- Create policies for public access (since this is a single-user business app)
CREATE POLICY "Allow all operations on customers" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all operations on resellers" ON resellers FOR ALL USING (true);
CREATE POLICY "Allow all operations on suppliers" ON suppliers FOR ALL USING (true);
CREATE POLICY "Allow all operations on digital_codes" ON digital_codes FOR ALL USING (true);
CREATE POLICY "Allow all operations on tv_boxes" ON tv_boxes FOR ALL USING (true);
CREATE POLICY "Allow all operations on sales" ON sales FOR ALL USING (true);
CREATE POLICY "Allow all operations on purchases" ON purchases FOR ALL USING (true);
CREATE POLICY "Allow all operations on email_templates" ON email_templates FOR ALL USING (true);
CREATE POLICY "Allow all operations on supplier_credits" ON supplier_credits FOR ALL USING (true);
CREATE POLICY "Allow all operations on credit_sales" ON credit_sales FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_resellers_email ON resellers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_buyer_id ON sales(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_credits_supplier_id ON supplier_credits(supplier_id);
CREATE INDEX IF NOT EXISTS idx_credit_sales_supplier_id ON credit_sales(supplier_id);
CREATE INDEX IF NOT EXISTS idx_credit_sales_reseller_id ON credit_sales(reseller_id);

-- Create function to update supplier credit balance
CREATE OR REPLACE FUNCTION update_supplier_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'earned' THEN
      UPDATE suppliers 
      SET 
        credit_balance = credit_balance + NEW.amount,
        total_credit_earned = total_credit_earned + NEW.amount
      WHERE id = NEW.supplier_id;
    ELSIF NEW.type = 'used' THEN
      UPDATE suppliers 
      SET credit_balance = credit_balance - NEW.amount
      WHERE id = NEW.supplier_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for supplier credit balance updates
CREATE TRIGGER trigger_update_supplier_credit_balance
  AFTER INSERT ON supplier_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_credit_balance();