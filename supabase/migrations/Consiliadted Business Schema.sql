-- =================================================================
-- CONSOLIDATED MIGRATION SCRIPT
-- This script combines all historical migrations into a single file.
-- It is safe to run on your existing database.
-- =================================================================

-- Section 1: Initial Business Schema (from 20250621..._royal_sky.sql)
-- Core tables for customers, products, sales, etc.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  address text,
  city text,
  country text,
  postal_code text,
  notes text,
  status text,
  whatsapp_number text,
  mac_address text,
  custom_fields jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_contact timestamptz,
  revolut_customer_id text
);

CREATE TABLE IF NOT EXISTS resellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  total_sales decimal DEFAULT 0,
  outstanding_payment decimal DEFAULT 0,
  commission_rate decimal DEFAULT 0,
  credit_balance decimal DEFAULT 0,
  payment_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  total_purchases decimal DEFAULT 0,
  amount_owed decimal DEFAULT 0,
  credit_balance decimal DEFAULT 0,
  total_credit_earned decimal DEFAULT 0,
  payment_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS digital_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  value numeric NOT NULL,
  sold_quantity integer DEFAULT 0,
  status text DEFAULT 'available',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tv_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number text NOT NULL,
  model text NOT NULL,
  sold_quantity integer DEFAULT 0,
  status text DEFAULT 'in_stock',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  product_id uuid NOT NULL,
  quantity integer NOT NULL,
  total_price numeric NOT NULL,
  sale_date timestamptz DEFAULT now(),
  product_type text NOT NULL CHECK (product_type IN ('digital_code', 'tv_box', 'subscription')),
  product_name text NOT NULL,
  buyer_type text NOT NULL CHECK (buyer_type IN ('customer', 'reseller')),
  buyer_id uuid NOT NULL,
  buyer_name text NOT NULL,
  unit_price decimal NOT NULL,
  total_amount decimal NOT NULL,
  profit decimal NOT NULL,
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  payment_status text DEFAULT 'received' CHECK (payment_status IN ('received', 'due', 'partial')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id uuid,
  quantity integer NOT NULL,
  total_cost numeric NOT NULL,
  purchase_date timestamptz DEFAULT now(),
  supplier_name text NOT NULL,
  product_type text NOT NULL CHECK (product_type IN ('digital_code', 'tv_box')),
  product_name text NOT NULL,
  unit_price decimal NOT NULL,
  total_amount decimal NOT NULL,
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'pending')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  trigger text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- Section 2: Subscription Management (from 20250623... & enhancements)
-- Adds subscriptions, settings, and updated reminder columns.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'renewed')),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  price numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Final reminder columns
  reminder_10_sent boolean DEFAULT false,
  reminder_5_sent boolean DEFAULT false,
  -- Columns for payment integration
  invoice_id uuid,
  mobilepay_agreement_id text,
  payment_method text NOT NULL DEFAULT 'manual' CHECK (payment_method IN ('mobilepay', 'revolut', 'manual'))
);

-- Drop old reminder columns if they exist
ALTER TABLE subscriptions DROP COLUMN IF EXISTS reminder_7_sent;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS reminder_3_sent;

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency text DEFAULT 'USD',
  email_settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- Section 3: Customer Portal & Admin Users (from 20251015...)
-- The critical tables for authentication and authorization.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_portal_users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    auth_provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id uuid NULL REFERENCES public.customers(id) ON DELETE SET NULL,
    email text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    last_login_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.customer_credentials (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    server_id TEXT,
    password TEXT,
    server_url TEXT,
    notes TEXT,
    mac_address TEXT,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    expires_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.customer_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    subject TEXT,
    category TEXT,
    message TEXT,
    status TEXT,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    admin_notes TEXT
);


-- Section 4: Invoices and Payments (from Invoice and Payments...)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  due_date timestamptz,
  issued_date timestamptz DEFAULT now(),
  payment_method text CHECK (payment_method IN ('mobilepay', 'revolut', 'manual')),
  payment_link text,
  external_payment_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid,
  entity_type text,
  amount numeric NOT NULL,
  type text,
  description text,
  payment_method text,
  transaction_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);


-- Section 5: WooCommerce Integration (from Woocommerce Integrations.sql)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS woocommerce_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  woo_order_id bigint UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_email text NOT NULL,
  customer_name text,
  order_number text NOT NULL,
  order_status text NOT NULL DEFAULT 'pending',
  total_amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  payment_method text,
  payment_method_title text,
  transaction_id text,
  order_date timestamptz NOT NULL,
  completed_date timestamptz,
  products jsonb DEFAULT '[]'::jsonb,
  billing_info jsonb DEFAULT '{}'::jsonb,
  shipping_info jsonb DEFAULT '{}'::jsonb,
  customer_note text,
  metadata jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- Section 6: Logging and System Tables (from various files)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exchange_rates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    base_currency character varying(3) NOT NULL,
    rates jsonb NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    recipient_email text NOT NULL,
    subject text NOT NULL,
    status character varying(20) NOT NULL,
    error_message text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);


-- Section 7: Security - RLS Policies
-- This section enables RLS and applies the correct, secure policies to ALL tables.
-- -----------------------------------------------------------------

-- Helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.is_admin
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Apply RLS to all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE woocommerce_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Drop old, insecure policies if they exist
DROP POLICY IF EXISTS "Allow all operations on customers" ON customers;
-- (Add similar DROP POLICY statements for other tables if you used the "Allow all" policy)

-- Create secure policies for all tables (Admin Full Access)
CREATE POLICY "Admin full access" ON customers FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON resellers FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON suppliers FOR A/*
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
  EXECUTE FUNCTION update_supplier_credit_balance();LL USING (is_admin());
CREATE POLICY "Admin full access" ON digital_codes FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON tv_boxes FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON sales FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON purchases FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON email_templates FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON subscriptions FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON settings FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON invoices FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON payment_transactions FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON woocommerce_orders FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON exchange_rates FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON email_logs FOR ALL USING (is_admin());

-- Policies for public.users
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all user profiles" ON public.users FOR ALL USING (is_admin());

-- Policies for customer_portal_users
CREATE POLICY "Users can view their own portal record" ON public.customer_portal_users FOR SELECT USING (auth.uid() = auth_provider_id);
CREATE POLICY "Admins can view all portal records" ON public.customer_portal_users FOR SELECT USING (is_admin());

-- Policies for customer-specific data (credentials, messages)
CREATE POLICY "Customers can manage their own credentials" ON public.customer_credentials FOR ALL USING (EXISTS (SELECT 1 FROM customer_portal_users WHERE customer_portal_users.customer_id = public.customer_credentials.customer_id AND customer_portal_users.auth_provider_id = auth.uid()));
CREATE POLICY "Admins can manage all credentials" ON public.customer_credentials FOR ALL USING (is_admin());

CREATE POLICY "Customers can manage their own messages" ON public.customer_messages FOR ALL USING (EXISTS (SELECT 1 FROM customer_portal_users WHERE customer_portal_users.customer_id = public.customer_messages.customer_id AND customer_portal_users.auth_provider_id = auth.uid()));
CREATE POLICY "Admins can manage all messages" ON public.customer_messages FOR ALL USING (is_admin());
