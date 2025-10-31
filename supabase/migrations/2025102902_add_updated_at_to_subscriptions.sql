-- Add updated_at column to subscriptions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;