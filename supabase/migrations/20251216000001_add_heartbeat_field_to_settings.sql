-- Add heartbeat tracking field to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN settings.last_heartbeat_at IS 'Timestamp of last successful heartbeat from Netlify function';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_settings_last_heartbeat_at ON settings(last_heartbeat_at DESC);

-- Update RLS policy to allow anonymous updates for heartbeat field
CREATE POLICY IF NOT EXISTS "Allow anonymous heartbeat updates" ON settings
  FOR UPDATE USING (auth.role() = 'anon' AND 
    (xpath('/update/text()', current_setting)::text = 'last_heartbeat_at' OR 
     xpath('/update/text()', current_setting)::text = 'last_heartbeat_at'));

-- Allow anonymous users to read only the heartbeat field
CREATE POLICY IF NOT EXISTS "Allow anonymous heartbeat reads" ON settings
  FOR SELECT USING (auth.role() = 'anon' AND 
    (xpath('/column/text()', current_setting)::text = 'last_heartbeat_at' OR 
     xpath('/column/text()', current_setting)::text = 'last_heartbeat_at'));