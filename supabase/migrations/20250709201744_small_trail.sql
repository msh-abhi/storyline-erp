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