DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

/*
  # Update Subscription Reminders to 10/5 Days

  1. Database Changes
    - Add new reminder columns for 10-day and 5-day reminders
    - Keep existing columns for backward compatibility during transition
    
  2. Security
    - No RLS changes needed as table structure remains the same
*/

-- Add new reminder columns for 10-day and 5-day reminders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'reminder_10_sent'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN reminder_10_sent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'reminder_5_sent'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN reminder_5_sent boolean DEFAULT false;
  END IF;
END $$;

-- Drop any triggers that might reference old columns
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;

-- Update existing active subscriptions to reset reminder flags
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'reminder_10_sent'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'reminder_5_sent'
  ) THEN
    UPDATE subscriptions
    SET
      reminder_10_sent = false,
      reminder_5_sent = false
    WHERE status = 'active';
  END IF;
END $$;

-- Recreate the updated_at trigger if it was dropped
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- Create index for better performance on reminder queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_reminder_10_sent ON subscriptions(reminder_10_sent);
CREATE INDEX IF NOT EXISTS idx_subscriptions_reminder_5_sent ON subscriptions(reminder_5_sent);