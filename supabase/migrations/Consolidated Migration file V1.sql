-- =================================================================
-- DEFINITIVE CONSOLIDATED MIGRATION SCRIPT (V3 - Corrected RLS Drop Order)
-- This script combines ALL user-provided migrations, resolves conflicts,
-- and ensures correct RLS for admin access.
-- It explicitly drops policies BEFORE dropping the dependent function.
-- =================================================================

-- Section 1: Core ERP Tables (from 20250621..._royal_sky.sql)
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
  -- Reminder columns (from Subscription Reminder Tracking Enhancement.sql)
  reminder_10_sent boolean DEFAULT false,
  reminder_5_sent boolean DEFAULT false,
  -- Columns for payment integration (from Invoice and Payments Transactions.sql)
  invoice_id uuid, -- Will be linked to invoices table later
  mobilepay_agreement_id text,
  payment_method text NOT NULL DEFAULT 'manual' CHECK (payment_method IN ('mobilepay', 'revolut', 'manual'))
);

-- Ensure old reminder columns are dropped if they exist
ALTER TABLE IF EXISTS subscriptions DROP COLUMN IF EXISTS reminder_7_sent;
ALTER TABLE IF EXISTS subscriptions DROP COLUMN IF EXISTS reminder_3_sent;

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency text DEFAULT 'USD',
  email_settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- Section 3: Customer Portal & Admin Users (from 20251015_customer_portal_setup.sql)
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


-- Section 4: Invoices and Payment Transactions (from invoices_and_payment_transactions_management.sql)
-- NOTE: This section uses YOUR original definitions for invoices and payment_transactions.
-- It also ADDS the 'payments' table that the AppContext expects.
-- -----------------------------------------------------------------

-- Invoices table (from your original migration)
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  due_date timestamptz NOT NULL,
  issued_date timestamptz DEFAULT now(),
  payment_method text NOT NULL CHECK (payment_method IN ('mobilepay', 'revolut', 'manual')),
  payment_link text,
  external_payment_id text, -- MobilePay agreement ID or Revolut payment ID
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payment_transactions table (from your original migration)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('mobilepay', 'revolut', 'manual')),
  amount numeric NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  transaction_id text UNIQUE, -- Actual transaction ID from payment provider
  provider_response jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payments table (introduced because AppContext expects it, not in your original migrations)
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
    recipient_name text,
    template_id uuid,
    template_name text,
    subject text NOT NULL,
    content text,
    status character varying(20) NOT NULL, -- e.g., 'sent', 'failed', 'pending'
    error_message text,
    provider character varying(50),
    provider_message_id text,
    metadata jsonb,
    sent_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);


-- Section 7: Triggers for updated_at timestamps (from Invoice and Payments Transactions.sql)
-- -----------------------------------------------------------------

-- Function to automatically update updated_at timestamp for invoices
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invoices updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoices_updated_at_trigger') THEN
    CREATE TRIGGER update_invoices_updated_at_trigger
      BEFORE UPDATE ON invoices
      FOR EACH ROW
      EXECUTE FUNCTION update_invoices_updated_at();
  END IF;
END $$;

-- Function to automatically update updated_at timestamp for payment_transactions
CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for payment_transactions updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payment_transactions_updated_at_trigger') THEN
    CREATE TRIGGER update_payment_transactions_updated_at_trigger
      BEFORE UPDATE ON payment_transactions
      FOR EACH ROW
      EXECUTE FUNCTION update_payment_transactions_updated_at();
  END IF;
END $$;


-- Section 8: Row Level Security (RLS) Policies
-- This section enables RLS and applies the correct, secure policies to ALL tables.
-- Existing policies will be dropped and recreated to ensure consistency.
-- -----------------------------------------------------------------

-- 1. Drop all existing policies that might depend on is_admin()
-- This must happen BEFORE dropping the is_admin() function.
DO $$ DECLARE
    r record;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename || ';';
    END LOOP;
END $$;

-- 2. Drop and recreate the is_admin() helper function
-- Now it can be dropped safely as no policies depend on it.
DROP FUNCTION IF EXISTS is_admin();
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.is_admin
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Enable RLS for all tables (if not already enabled)
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS digital_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tv_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY; -- New payments table
ALTER TABLE IF EXISTS woocommerce_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_logs ENABLE ROW LEVEL SECURITY;


-- 4. Create secure policies for all tables (Admin Full Access)
CREATE POLICY "Admin full access on customers" ON customers FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on resellers" ON resellers FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on suppliers" ON suppliers FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on digital_codes" ON digital_codes FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on tv_boxes" ON tv_boxes FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on sales" ON sales FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on purchases" ON purchases FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on email_templates" ON email_templates FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on subscriptions" ON subscriptions FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on settings" ON settings FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on invoices" ON invoices FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on payment_transactions" ON payment_transactions FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on payments" ON payments FOR ALL USING (is_admin()); -- New payments table
CREATE POLICY "Admin full access on woocommerce_orders" ON woocommerce_orders FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on exchange_rates" ON exchange_rates FOR ALL USING (is_admin());
CREATE POLICY "Admin full access on email_logs" ON email_logs FOR ALL USING (is_admin());

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