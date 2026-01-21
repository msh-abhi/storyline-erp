# Heartbeat System Fix Guide

This guide will help you fix all issues with your Supabase heartbeat implementation.

## Issues Identified

1. ❌ HeartbeatStatus component not integrated in Settings page
2. ❌ Database migrations may not be applied
3. ❌ Netlify function may not be properly deployed
4. ❌ No frontend visibility of heartbeat status

## Fix Steps

### Step 1: Check Database Migrations

Run the migration check script:

```bash
cd project
node check-heartbeat-migrations.js
```

This will tell you if:
- `heartbeat_logs` table exists
- `last_heartbeat_at` column exists in settings table
- Current heartbeat data status

If migrations are missing, apply them:

```bash
# Option 1: Using Supabase CLI
supabase db push

# Option 2: Apply manually in Supabase dashboard
# Go to Supabase → SQL Editor → Run these files:
# - supabase/migrations/20251216000000_create_heartbeat_logs.sql
# - supabase/migrations/20251216000001_add_heartbeat_field_to_settings.sql
```

### Step 2: Test Heartbeat Function Logic

Run the function test script:

```bash
cd project
node test-heartbeat-function.js
```

This tests:
- Settings table update
- Heartbeat_logs table insertion
- Data reading capabilities

### Step 3: Deploy Netlify Function

1. Ensure your `netlify/functions/supabase-heartbeat.ts` is deployed
2. Check `netlify.toml` has the scheduled function configuration
3. Deploy to Netlify:

```bash
# If using Netlify CLI
netlify deploy --prod

# Or push to git if auto-deploy is configured
git add .
git commit -m "Fix heartbeat system"
git push origin main
```

### Step 4: Test Netlify Function Manually

1. Go to Netlify dashboard → Functions
2. Find `supabase-heartbeat` function
3. Click **Invoke** to test manually
4. Check function logs for success/failure

### Step 5: Verify Frontend Integration

The heartbeat status should now appear in your Settings page:

1. Go to your application's Settings page
2. Look for "System Heartbeat Status" section
3. It should show:
   - Current status (Healthy/Warning/Critical)
   - Last heartbeat time
   - Next expected check time

### Step 6: Monitor Netlify Function

1. Go to Netlify dashboard → Functions
2. Find `supabase-heartbeat` function
3. Check that it runs daily at 9:00 AM UTC
4. Monitor function logs for successful execution

## Expected Results

After completing all steps:

✅ **Netlify Function**: Primary heartbeat runs daily at 9:00 AM UTC
✅ **Database**: heartbeat_logs table receives entries, settings.last_heartbeat_at updates
✅ **Frontend**: Settings page shows real-time heartbeat status
✅ **Monitoring**: Heartbeat keeps Supabase project active on free tier

## Troubleshooting

### If Netlify function fails:
- Check environment variables in Netlify dashboard
- Verify function logs for specific errors
- Ensure function is properly deployed

### If Netlify function fails:
- Check environment variables in Netlify dashboard
- Verify function logs for specific errors
- Ensure function is properly deployed

### If database errors occur:
- Run migration check script again
- Verify RLS policies allow anonymous inserts
- Check table permissions in Supabase dashboard

### If frontend doesn't show status:
- Check browser console for JavaScript errors
- Verify Settings component imported HeartbeatStatus
- Ensure API calls are not blocked by CORS

## Monitoring Commands

### Check heartbeat status in database:
```sql
-- Recent heartbeat logs
SELECT * FROM heartbeat_logs 
ORDER BY executed_at DESC 
LIMIT 10;

-- Settings heartbeat timestamp
SELECT last_heartbeat_at, updated_at 
FROM settings 
ORDER BY updated_at DESC 
LIMIT 1;

-- Heartbeat success rate
SELECT 
  status,
  COUNT(*) as count,
  MAX(executed_at) as last_execution
FROM heartbeat_logs 
GROUP BY status;
```

### Check Netlify function logs:
1. Netlify dashboard → Functions → supabase-heartbeat
2. Click "Functions" tab to view execution logs

### Check Netlify Function:
1. Netlify dashboard → Functions → supabase-heartbeat
2. Click "Functions" tab to view execution logs

## Automation

Once everything is working:
- Primary heartbeat runs daily at 9:00 AM UTC (Netlify)
- Frontend updates every 5 minutes when Settings page is open
- Database maintains complete heartbeat history
- Supabase project stays active on free tier

## Support

If you encounter issues:
1. Run the diagnostic scripts first
2. Check logs in both systems (Netlify, Supabase)
3. Verify environment variables match across platforms
4. Ensure database permissions are correct

The heartbeat system should now keep your Supabase project active without manual intervention!