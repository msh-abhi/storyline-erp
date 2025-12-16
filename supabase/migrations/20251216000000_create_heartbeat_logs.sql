-- Create heartbeat logging table for monitoring Supabase activity
CREATE TABLE IF NOT EXISTS heartbeat_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  executed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE heartbeat_logs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for the heartbeat function)
CREATE POLICY "Allow anonymous heartbeat logs" ON heartbeat_logs
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to view logs
CREATE POLICY "Allow authenticated users to view heartbeat logs" ON heartbeat_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_heartbeat_logs_executed_at ON heartbeat_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_heartbeat_logs_status ON heartbeat_logs(status);

-- Add comment for documentation
COMMENT ON TABLE heartbeat_logs IS 'Logs for automated heartbeat activity to keep Supabase project active';
COMMENT ON COLUMN heartbeat_logs.executed_at IS 'When the heartbeat was executed';
COMMENT ON COLUMN heartbeat_logs.status IS 'Status of the heartbeat execution (success/error)';
COMMENT ON COLUMN heartbeat_logs.error_message IS 'Error message if heartbeat failed';