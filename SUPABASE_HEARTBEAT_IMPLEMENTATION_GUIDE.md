# Supabase Heartbeat Implementation Guide

## Quick Start for Netlify Solution

Since you're using Netlify, here's the fastest path to implementing the heartbeat solution:

### Step 1: Create the Netlify Function

Create a new file at `netlify/functions/supabase-heartbeat.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const handler = async (event, context) => {
  try {
    console.log('Starting Supabase heartbeat at:', new Date().toISOString());
    
    // Perform a lightweight query to generate activity
    const { data, error } = await supabase
      .from('settings')
      .select('updated_at')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Ignore "not found" errors
      console.error('Heartbeat query failed:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // Optional: Log the heartbeat activity to a dedicated table
    try {
      await supabase
        .from('heartbeat_logs')
        .insert({
          executed_at: new Date().toISOString(),
          status: 'success'
        });
    } catch (logError) {
      // Don't fail the heartbeat if logging fails
      console.warn('Failed to log heartbeat activity:', logError);
    }
    
    console.log('Heartbeat completed successfully');
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Supabase heartbeat executed successfully',
        timestamp: new Date().toISOString(),
        lastActivity: data?.updated_at
      })
    };
    
  } catch (error) {
    console.error('Heartbeat function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
```

### Step 2: Update Netlify Configuration

Add this to your existing `netlify.toml` file:

```toml
# Add this section to your existing netlify.toml
[[scheduled_functions]]
  function = "supabase-heartbeat"
  schedule = "0 9 * * *"  # Daily at 9:00 AM UTC
```

### Step 3: Set Up Environment Variables

In your Netlify dashboard, add these environment variables:

1. Go to Site settings → Build & deploy → Environment
2. Add these variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Step 4: Create Heartbeat Logging Table (Optional)

Run this SQL in your Supabase SQL editor:

```sql
-- Create heartbeat logging table (optional but recommended)
CREATE TABLE IF NOT EXISTS heartbeat_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  executed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Set up RLS for the heartbeat_logs table
ALTER TABLE heartbeat_logs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for the heartbeat function)
CREATE POLICY "Allow anonymous heartbeat logs" ON heartbeat_logs
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to view logs
CREATE POLICY "Allow authenticated users to view heartbeat logs" ON heartbeat_logs
  FOR SELECT USING (auth.role() = 'authenticated');
```

### Step 5: Deploy and Test

1. Commit and push your changes to trigger Netlify deployment
2. After deployment, test the function manually:
   - Go to Netlify Functions tab
   - Find `supabase-heartbeat` function
   - Click "Invoke" to test
3. Check the function logs to verify it's working

## Alternative Implementation Options

### Option 1: Supabase Edge Function + Third-Party Cron

If you prefer using Supabase Edge Functions instead of Netlify:

#### Create the Edge Function

Create `supabase/functions/heartbeat/index.ts`:

```typescript
import { corsHeaders } from '../_shared/cors';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('Heartbeat triggered at:', new Date().toISOString());
    
    // Perform a lightweight database operation
    const { data, error } = await supabase
      .from('settings')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Heartbeat error:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Heartbeat successful',
        timestamp: new Date().toISOString(),
        data: data
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
});
```

#### Set Up Third-Party Cron Service

1. **Cron-job.org** (Free):
   - URL: `https://your-project-ref.supabase.co/functions/v1/heartbeat`
   - Method: `GET`
   - Schedule: `0 9 * * *` (Daily at 9:00 AM UTC)

2. **UptimeRobot** (Free monitoring):
   - Monitor Type: HTTP(s)
   - URL: `https://your-project-ref.supabase.co/functions/v1/heartbeat`
   - Monitoring Interval: 5 minutes (overkill but ensures activity)

### Option 2: GitHub Actions

Create `.github/workflows/supabase-heartbeat.yml`:

```yaml
name: Supabase Heartbeat

on:
  schedule:
    # Run daily at 9:00 AM UTC
    - cron: '0 9 * * *'
  workflow_dispatch: # Allow manual triggering

jobs:
  heartbeat:
    runs-on: ubuntu-latest
    
    steps:
    - name: Execute Supabase Heartbeat
      run: |
        response=$(curl -s -w "%{http_code}" -X GET \
          '${{ secrets.SUPABASE_URL }}/rest/v1/settings?select=id&limit=1' \
          -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
          -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
          -H "Content-Type: application/json")
        
        http_code="${response: -3}"
        body="${response%???}"
        
        echo "HTTP Status: $http_code"
        echo "Response Body: $body"
        
        if [ "$http_code" -ne 200 ]; then
          echo "Heartbeat failed with HTTP code: $http_code"
          exit 1
        fi
      
    - name: Log Heartbeat Result
      run: |
        echo "Heartbeat executed successfully at $(date -u)"
        
    - name: Notify on Failure
      if: failure()
      run: |
        echo "Supabase heartbeat failed at $(date -u)"
```

#### Required GitHub Secrets

In your GitHub repository settings, add these secrets:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Monitoring and Troubleshooting

### Monitoring the Heartbeat

1. **Netlify Function Logs**:
   - Go to Netlify → Functions → `supabase-heartbeat`
   - Check the "Functions" tab for execution logs

2. **Database Logs** (if using heartbeat_logs table):
   ```sql
   -- View recent heartbeat activity
   SELECT * FROM heartbeat_logs 
   ORDER BY executed_at DESC 
   LIMIT 10;
   ```

3. **Supabase Dashboard**:
   - Check the "Activity" tab for API requests
   - Monitor database usage in "Settings" → "Billing"

### Common Issues and Solutions

#### Issue: Function Not Triggering

**Symptoms**: No logs in Netlify Functions, Supabase shows inactivity

**Solutions**:
1. Verify `netlify.toml` syntax is correct
2. Check that the function file is in the correct directory
3. Ensure the function is properly deployed
4. Verify the cron schedule syntax (`0 9 * * *`)

#### Issue: Authentication Errors

**Symptoms**: 401/403 errors in function logs

**Solutions**:
1. Verify environment variables are set in Netlify
2. Check that the Supabase URL is correct
3. Ensure the anon key is valid and not expired
4. Test the API key manually with curl

#### Issue: Database Query Failures

**Symptoms**: Database errors in function logs

**Solutions**:
1. Verify the `settings` table exists
2. Check RLS policies allow anonymous access
3. Test the query manually in Supabase SQL editor
4. Ensure the anon key has the necessary permissions

### Emergency Manual Activation

If your project gets paused:

1. **Log into Supabase Dashboard**
2. **Navigate to your project**
3. **Click "Resume Project"**
4. **Verify heartbeat is working**
5. **Consider adding a backup method**

## Security Best Practices

### API Key Management

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate keys periodically** (every 3-6 months)
4. **Use anon keys** for automated operations, not service keys

### Access Control

1. **Implement Row Level Security** on all tables
2. **Create minimal policies** for automated operations
3. **Audit function logs** regularly
4. **Monitor for unusual activity**

### Example Secure RLS Policy

```sql
-- Create a dedicated table for heartbeat operations
CREATE TABLE IF NOT EXISTS system_heartbeat (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  executed_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  status text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Secure RLS policy
ALTER TABLE system_heartbeat ENABLE ROW LEVEL SECURITY;

-- Only allow anonymous inserts (for automated systems)
CREATE POLICY "Allow anonymous heartbeat inserts" ON system_heartbeat
  FOR INSERT WITH CHECK (
    source = 'netlify-function' AND 
    status IN ('success', 'error')
  );

-- Only allow authenticated users to read logs
CREATE POLICY "Allow authenticated users to read heartbeat" ON system_heartbeat
  FOR SELECT USING (auth.role() = 'authenticated');
```

## Performance Optimization

### Minimizing Resource Usage

1. **Use lightweight queries** (avoid complex joins)
2. **Limit result sets** with `LIMIT 1`
3. **Cache responses** when possible
4. **Monitor execution time** and optimize

### Optimized Heartbeat Query Examples

```sql
-- Minimal query (recommended)
SELECT updated_at FROM settings LIMIT 1;

-- Alternative: Check system time
SELECT now() as current_time;

-- Alternative: Simple count query
SELECT 1 as heartbeat;

-- Alternative: Check table existence
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'settings'
) as table_exists;
```

## Advanced Features

### Heartbeat with Health Checks

```typescript
// Enhanced heartbeat with health checks
export const handler = async (event, context) => {
  const startTime = Date.now();
  const healthStatus = {
    database: 'unknown',
    timestamp: new Date().toISOString(),
    duration: 0
  };

  try {
    // Test database connectivity
    const { data, error } = await supabase
      .from('settings')
      .select('updated_at')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      healthStatus.database = 'error';
      throw error;
    }

    healthStatus.database = 'healthy';
    
    // Log detailed health status
    await supabase
      .from('heartbeat_logs')
      .insert({
        executed_at: new Date().toISOString(),
        status: 'success',
        metadata: {
          health: healthStatus,
          duration: Date.now() - startTime
        }
      });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Heartbeat successful',
        health: healthStatus,
        duration: Date.now() - startTime
      })
    };

  } catch (error) {
    healthStatus.database = 'error';
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        health: healthStatus,
        duration: Date.now() - startTime
      })
    };
  }
};
```

### Multi-Region Failover

For critical applications, consider implementing multiple heartbeat sources:

```typescript
// Heartbeat with source identification
const HEARTBEAT_SOURCES = ['netlify-primary', 'github-backup', 'cron-emergency'];

export const handler = async (event, context) => {
  const source = process.env.HEARTBEAT_SOURCE || 'unknown';
  
  try {
    // Perform heartbeat
    const { data, error } = await supabase
      .from('settings')
      .select('updated_at')
      .limit(1)
      .single();

    // Log with source information
    await supabase
      .from('heartbeat_logs')
      .insert({
        executed_at: new Date().toISOString(),
        status: 'success',
        source: source
      });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        source: source,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        source: source
      })
    };
  }
};
```

## Conclusion

This implementation guide provides everything you need to keep your Supabase project active on the free tier. The Netlify Scheduled Functions approach is recommended for your setup, but alternative options are available if your requirements change.

Remember to:
1. **Test thoroughly** before relying on the heartbeat
2. **Monitor regularly** to ensure it's working
3. **Have a backup plan** in case of failures
4. **Keep security best practices** in mind

With this solution in place, your Supabase project should remain active without requiring manual intervention.