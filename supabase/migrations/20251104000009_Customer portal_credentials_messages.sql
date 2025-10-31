-- Example: Create a public.users table for application-specific profiles
-- If you already have a 'profiles' or 'app_users' table, adapt this.
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies for public.users (adjust as needed)
DROP POLICY IF EXISTS "Public users can view their own profile." ON public.users;
CREATE POLICY "Public users can view their own profile."
ON public.users FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Public users can update their own profile." ON public.users;
CREATE POLICY "Public users can update their own profile."
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- Function to create a public.users entry when a new auth.user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new auth.user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  -- 1. Add 'portal_enabled' to the existing 'customers' table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT FALSE;

-- 2. Create 'customer_portal_users' table
CREATE TABLE IF NOT EXISTS customer_portal_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    auth_provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to Supabase auth.users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_customer
        FOREIGN KEY(customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_portal_users_email ON customer_portal_users (email);
CREATE INDEX IF NOT EXISTS idx_customer_portal_users_customer_id ON customer_portal_users (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_portal_users_auth_provider_id ON customer_portal_users (auth_provider_id);

-- Set up Row Level Security for customer_portal_users
ALTER TABLE customer_portal_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their own portal user entry." ON customer_portal_users;
CREATE POLICY "Customers can view their own portal user entry."
ON customer_portal_users FOR SELECT
USING (auth_provider_id = auth.uid());

DROP POLICY IF EXISTS "Customers can update their own portal user entry." ON customer_portal_users;
CREATE POLICY "Customers can update their own portal user entry."
ON customer_portal_users FOR UPDATE
USING (auth_provider_id = auth.uid());

-- 3. Create 'customer_credentials' table for IPTV credentials
CREATE TABLE IF NOT EXISTS customer_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    server_id TEXT NOT NULL,
    password TEXT NOT NULL, -- Consider encrypting this in your application layer
    server_url TEXT NOT NULL,
    notes TEXT,
    mac_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_customer_credentials
        FOREIGN KEY(customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_credentials_customer_id ON customer_credentials (customer_id);

-- Set up Row Level Security for customer_credentials
ALTER TABLE customer_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their own credentials." ON customer_credentials;
CREATE POLICY "Customers can view their own credentials."
ON customer_credentials FOR SELECT
USING (customer_id IN (SELECT customer_id FROM customer_portal_users WHERE auth_provider_id = auth.uid()));

-- Admins can manage credentials (assuming admin role check)
DROP POLICY IF EXISTS "Admins can manage all credentials." ON customer_credentials;
CREATE POLICY "Admins can manage all credentials."
ON customer_credentials FOR ALL
USING (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.is_admin = TRUE));


-- 4. Create 'customer_messages' table for contact form submissions
CREATE TABLE IF NOT EXISTS customer_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL, -- SET NULL if customer is deleted
    subject TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g., 'billing', 'technical', 'general'
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new' NOT NULL, -- e.g., 'new', 'read', 'resolved'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    admin_notes TEXT,
    CONSTRAINT fk_customer_messages
        FOREIGN KEY(customer_id)
        REFERENCES customers(id)
        ON DELETE SET NULL
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_messages_customer_id ON customer_messages (customer_id);

-- Set up Row Level Security for customer_messages
ALTER TABLE customer_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their own messages." ON customer_messages;
CREATE POLICY "Customers can view their own messages."
ON customer_messages FOR SELECT
USING (customer_id IN (SELECT customer_id FROM customer_portal_users WHERE auth_provider_id = auth.uid()));

DROP POLICY IF EXISTS "Customers can create their own messages." ON customer_messages;
CREATE POLICY "Customers can create their own messages."
ON customer_messages FOR INSERT
WITH CHECK (customer_id IN (SELECT customer_id FROM customer_portal_users WHERE auth_provider_id = auth.uid()));

-- Admins can manage messages
DROP POLICY IF EXISTS "Admins can manage all messages." ON customer_messages;
CREATE POLICY "Admins can manage all messages."
ON customer_messages FOR ALL
USING (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.is_admin = TRUE));

-- Update 'updated_at' columns automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_customer_credentials_updated_at ON customer_credentials;
CREATE TRIGGER update_customer_credentials_updated_at
BEFORE UPDATE ON customer_credentials
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();