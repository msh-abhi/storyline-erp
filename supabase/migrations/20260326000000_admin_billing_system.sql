-- Admin Billing System Migration
-- Tracks Peter's subscription status, payment history, and billing records
-- for the JyskStream / StoryLine ERP retainer model.

-- ============================================================
-- 1. admin_subscription  – tracks the current subscription state
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_subscription (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- core plan
  status               TEXT NOT NULL DEFAULT 'trialing'
                         CHECK (status IN ('active','past_due','canceled','trialing','unpaid')),
  plan_core            BOOLEAN NOT NULL DEFAULT TRUE,
  plan_maintenance     BOOLEAN NOT NULL DEFAULT FALSE,
  -- amounts (USD cents)
  monthly_amount       INTEGER NOT NULL DEFAULT 5900,
  -- stripe
  stripe_customer_id   TEXT,
  stripe_subscription_id TEXT,
  -- paypal
  paypal_subscription_id TEXT,
  paypal_order_id      TEXT,
  -- payment gateway used
  payment_gateway      TEXT CHECK (payment_gateway IN ('stripe','paypal','manual')),
  -- billing cycle
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  next_billing_date    TIMESTAMPTZ,
  trial_end            TIMESTAMPTZ,
  canceled_at          TIMESTAMPTZ,
  -- metadata
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. admin_billing_transactions – immutable payment history ledger
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_billing_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id  UUID REFERENCES public.admin_subscription(id),
  -- amounts (USD cents)
  amount           INTEGER NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'usd',
  -- breakdown
  core_amount      INTEGER NOT NULL DEFAULT 5900,
  maintenance_amount INTEGER NOT NULL DEFAULT 0,
  -- gateway
  gateway          TEXT NOT NULL CHECK (gateway IN ('stripe','paypal','manual')),
  gateway_tx_id    TEXT,      -- stripe PaymentIntent id / paypal capture id
  gateway_invoice_id TEXT,    -- stripe invoice id (for PDF download)
  gateway_receipt_url TEXT,   -- direct receipt/invoice URL
  -- status
  status           TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','succeeded','failed','refunded')),
  -- billing period this payment covers
  period_start     TIMESTAMPTZ,
  period_end       TIMESTAMPTZ,
  -- plan snapshot at time of payment
  includes_maintenance BOOLEAN NOT NULL DEFAULT FALSE,
  -- customer-facing description
  description      TEXT,
  -- raw provider response for auditing
  provider_payload JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. Trigger: auto-update admin_subscription.updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_admin_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_subscription_updated_at ON public.admin_subscription;
CREATE TRIGGER trg_admin_subscription_updated_at
  BEFORE UPDATE ON public.admin_subscription
  FOR EACH ROW EXECUTE FUNCTION public.update_admin_subscription_updated_at();

-- ============================================================
-- 4. Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_admin_billing_tx_sub_id
  ON public.admin_billing_transactions(subscription_id);

CREATE INDEX IF NOT EXISTS idx_admin_billing_tx_created_at
  ON public.admin_billing_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_billing_tx_status
  ON public.admin_billing_transactions(status);

-- ============================================================
-- 5. RLS – admin-only access (service_role bypasses RLS)
-- ============================================================
ALTER TABLE public.admin_subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_billing_transactions ENABLE ROW LEVEL SECURITY;

-- Only allow authenticated admins (via is_admin check) or service role
CREATE POLICY "Admin subscription: admin read"
  ON public.admin_subscription FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_admin = TRUE
    )
  );

CREATE POLICY "Admin subscription: admin write"
  ON public.admin_subscription FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_admin = TRUE
    )
  );

CREATE POLICY "Admin billing tx: admin read"
  ON public.admin_billing_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_admin = TRUE
    )
  );

CREATE POLICY "Admin billing tx: admin insert"
  ON public.admin_billing_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_admin = TRUE
    )
  );

-- ============================================================
-- 6. Seed initial subscription record (trialing / active)
-- ============================================================
INSERT INTO public.admin_subscription (
  status,
  plan_core,
  plan_maintenance,
  monthly_amount,
  payment_gateway,
  notes
)
VALUES (
  'trialing',
  TRUE,
  FALSE,
  5900,
  NULL,
  'Initial subscription record - pending first payment from Peter.'
)
ON CONFLICT DO NOTHING;
