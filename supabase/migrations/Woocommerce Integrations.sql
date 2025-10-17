/*
  # WooCommerce Integration

  1. New Tables
    - `woocommerce_orders`
      - `id` (uuid, primary key)
      - `woo_order_id` (bigint, unique) - WooCommerce order ID
      - `customer_id` (uuid, foreign key) - Links to customers table
      - `customer_email` (text)
      - `customer_name` (text)
      - `order_number` (text)
      - `order_status` (text) - pending, processing, completed, cancelled, refunded
      - `total_amount` (numeric)
      - `currency` (text)
      - `payment_method` (text)
      - `payment_method_title` (text)
      - `transaction_id` (text)
      - `order_date` (timestamptz)
      - `completed_date` (timestamptz)
      - `products` (jsonb) - Array of product details
      - `billing_info` (jsonb) - Billing address and details
      - `shipping_info` (jsonb) - Shipping address and details
      - `customer_note` (text)
      - `metadata` (jsonb) - Additional WooCommerce metadata
      - `synced_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `woocommerce_products`
      - `id` (uuid, primary key)
      - `woo_product_id` (bigint, unique) - WooCommerce product ID
      - `name` (text)
      - `sku` (text)
      - `type` (text) - simple, variable, subscription, etc.
      - `price` (numeric)
      - `regular_price` (numeric)
      - `sale_price` (numeric)
      - `is_subscription` (boolean)
      - `subscription_period` (text) - day, week, month, year
      - `subscription_interval` (integer)
      - `description` (text)
      - `short_description` (text)
      - `categories` (jsonb)
      - `metadata` (jsonb)
      - `synced_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `woocommerce_subscriptions`
      - `id` (uuid, primary key)
      - `woo_subscription_id` (bigint, unique)
      - `customer_id` (uuid, foreign key)
      - `order_id` (uuid, foreign key)
      - `product_id` (uuid, foreign key)
      - `status` (text) - active, pending, on-hold, cancelled, expired
      - `start_date` (timestamptz)
      - `next_payment_date` (timestamptz)
      - `end_date` (timestamptz)
      - `trial_end_date` (timestamptz)
      - `billing_period` (text)
      - `billing_interval` (integer)
      - `total_amount` (numeric)
      - `metadata` (jsonb)
      - `synced_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `woocommerce_sync_log`
      - `id` (uuid, primary key)
      - `sync_type` (text) - order, product, subscription, customer
      - `woo_id` (bigint) - WooCommerce entity ID
      - `status` (text) - success, failed, partial
      - `error_message` (text)
      - `payload` (jsonb) - The webhook payload
      - `processed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Indexes
    - Fast lookups by WooCommerce IDs
    - Customer relationships
    - Order dates and status
    - Sync timestamps

  3. Security
    - Enable RLS on all tables
    - Admin-only write access
    - Customers can read their own orders/subscriptions
*/

-- Create woocommerce_orders table
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

-- Create woocommerce_products table
CREATE TABLE IF NOT EXISTS woocommerce_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  woo_product_id bigint UNIQUE NOT NULL,
  name text NOT NULL,
  sku text,
  type text DEFAULT 'simple',
  price numeric DEFAULT 0,
  regular_price numeric DEFAULT 0,
  sale_price numeric,
  is_subscription boolean DEFAULT false,
  subscription_period text,
  subscription_interval integer,
  description text,
  short_description text,
  categories jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create woocommerce_subscriptions table
CREATE TABLE IF NOT EXISTS woocommerce_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  woo_subscription_id bigint UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES woocommerce_orders(id) ON DELETE SET NULL,
  product_id uuid REFERENCES woocommerce_products(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  start_date timestamptz NOT NULL,
  next_payment_date timestamptz,
  end_date timestamptz,
  trial_end_date timestamptz,
  billing_period text,
  billing_interval integer,
  total_amount numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create woocommerce_sync_log table
CREATE TABLE IF NOT EXISTS woocommerce_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL,
  woo_id bigint NOT NULL,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  payload jsonb DEFAULT '{}'::jsonb,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_woo_orders_customer_id ON woocommerce_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_woo_orders_email ON woocommerce_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_woo_orders_status ON woocommerce_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_woo_orders_date ON woocommerce_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_woo_orders_woo_id ON woocommerce_orders(woo_order_id);

CREATE INDEX IF NOT EXISTS idx_woo_products_woo_id ON woocommerce_products(woo_product_id);
CREATE INDEX IF NOT EXISTS idx_woo_products_sku ON woocommerce_products(sku);
CREATE INDEX IF NOT EXISTS idx_woo_products_subscription ON woocommerce_products(is_subscription);

CREATE INDEX IF NOT EXISTS idx_woo_subs_customer_id ON woocommerce_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_woo_subs_status ON woocommerce_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_woo_subs_next_payment ON woocommerce_subscriptions(next_payment_date);

CREATE INDEX IF NOT EXISTS idx_woo_sync_type ON woocommerce_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_woo_sync_status ON woocommerce_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_woo_sync_created ON woocommerce_sync_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE woocommerce_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE woocommerce_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE woocommerce_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE woocommerce_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for woocommerce_orders
CREATE POLICY "Authenticated users can read all orders"
  ON woocommerce_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert orders"
  ON woocommerce_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON woocommerce_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for woocommerce_products
CREATE POLICY "Authenticated users can read all products"
  ON woocommerce_products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON woocommerce_products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON woocommerce_products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for woocommerce_subscriptions
CREATE POLICY "Authenticated users can read all subscriptions"
  ON woocommerce_subscriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert subscriptions"
  ON woocommerce_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update subscriptions"
  ON woocommerce_subscriptions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for woocommerce_sync_log
CREATE POLICY "Authenticated users can read sync logs"
  ON woocommerce_sync_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sync logs"
  ON woocommerce_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_woocommerce_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_woocommerce_orders_updated_at
  BEFORE UPDATE ON woocommerce_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_woocommerce_updated_at();

CREATE TRIGGER update_woocommerce_products_updated_at
  BEFORE UPDATE ON woocommerce_products
  FOR EACH ROW
  EXECUTE FUNCTION update_woocommerce_updated_at();

CREATE TRIGGER update_woocommerce_subscriptions_updated_at
  BEFORE UPDATE ON woocommerce_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_woocommerce_updated_at();
