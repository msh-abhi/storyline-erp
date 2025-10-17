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

-- Update existing active subscriptions to reset reminder flags
UPDATE subscriptions 
SET 
  reminder_10_sent = false,
  reminder_5_sent = false
WHERE status = 'active';

-- Create index for better performance on reminder queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_reminder_10_sent ON subscriptions(reminder_10_sent);
CREATE INDEX IF NOT EXISTS idx_subscriptions_reminder_5_sent ON subscriptions(reminder_5_sent);

ALTER TABLE subscriptions
DROP COLUMN IF EXISTS reminder_7_sent,
DROP COLUMN IF EXISTS reminder_3_sent;


-- 1. Add 10-day and 5-day reminder flags
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS reminder_10_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_5_sent BOOLEAN DEFAULT FALSE;

-- 2. Index the end_date column for faster queries on upcoming expirations
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date
ON subscriptions (end_date);

-- 3. Reset new columns for all existing rows (optional but good practice)
UPDATE subscriptions
SET reminder_10_sent = FALSE,
    reminder_5_sent = FALSE;


-- Add new reminder columns
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS reminder_10_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_5_sent BOOLEAN DEFAULT FALSE;

-- (Optional) Add index to improve performance for upcoming expiry queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry ON subscriptions (expires_at);

-- Reset newly added columns to default (in case of existing rows)
UPDATE subscriptions
SET reminder_10_sent = FALSE,
    reminder_5_sent = FALSE;

-- 🔄 Fix references: remove or replace any incorrect 'user_id' usage
-- If you had this line before (wrong):
-- WHERE user_id = 'xyz';

-- Use correct version instead:
-- WHERE customer_id = 'xyz';

SELECT * FROM subscriptions LIMIT 1;

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'subscriptions';
