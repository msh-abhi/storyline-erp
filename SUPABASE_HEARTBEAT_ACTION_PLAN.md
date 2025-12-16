# Supabase Heartbeat Action Plan

## Executive Summary

This document provides a concise, actionable plan to implement a robust heartbeat solution for your Supabase free-tier project. Based on your current Netlify hosting setup and daily heartbeat preference, we recommend implementing **Netlify Scheduled Functions** as the primary solution.

## Quick Implementation Checklist

### ✅ Pre-Implementation Checklist

- [ ] Confirm you have admin access to Netlify dashboard
- [ ] Verify your Supabase project URL and anon key
- [ ] Check that your `netlify.toml` file exists in project root
- [ ] Ensure you have `settings` table in your Supabase database

### 🚀 Implementation Steps (30 minutes total)

#### Step 1: Create Netlify Function (10 minutes)

Create file: `netlify/functions/supabase-heartbeat.ts`

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

#### Step 2: Update Netlify Configuration (5 minutes)

Add to your existing `netlify.toml`:

```toml
[[scheduled_functions]]
  function = "supabase-heartbeat"
  schedule = "0 9 * * *"  # Daily at 9:00 AM UTC
```

#### Step 3: Configure Environment Variables (5 minutes)

In Netlify dashboard:
1. Go to Site settings → Build & deploy → Environment
2. Add:
   - `SUPABASE_URL`: `https://your-project-ref.supabase.co`
   - `SUPABASE_ANON_KEY`: `your_supabase_anon_key`

#### Step 4: Deploy and Test (10 minutes)

1. Commit and push changes to trigger deployment
2. After deployment, test function manually:
   - Netlify → Functions → `supabase-heartbeat` → "Invoke"
3. Check function logs for successful execution

### 📊 Optional Enhancement: Heartbeat Logging (15 minutes)

Create this table in Supabase SQL editor:

```sql
CREATE TABLE IF NOT EXISTS heartbeat_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  executed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE heartbeat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous heartbeat logs" ON heartbeat_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view heartbeat logs" ON heartbeat_logs
  FOR SELECT USING (auth.role() = 'authenticated');
```

Add this logging code to your function (before the return statement):

```typescript
// Optional: Log the heartbeat activity
try {
  await supabase
    .from('heartbeat_logs')
    .insert({
      executed_at: new Date().toISOString(),
      status: 'success'
    });
} catch (logError) {
  console.warn('Failed to log heartbeat activity:', logError);
}
```

## Post-Implementation Monitoring

### 🔍 First Week Monitoring

**Day 1-3**: Check function logs daily
- Go to Netlify → Functions → `supabase-heartbeat`
- Verify successful execution at 9:00 AM UTC
- Check for any error messages

**Day 4-7**: Verify Supabase activity
- Check Supabase dashboard → Activity tab
- Confirm daily API requests are being generated
- Verify project remains active

### 📈 Ongoing Monitoring (Monthly)

- Review function execution logs
- Check heartbeat_logs table (if implemented)
- Monitor Supabase project status
- Verify no unexpected errors

## Troubleshooting Quick Reference

### Issue: Function Not Executing

**Symptoms**: No logs in Netlify Functions

**Solutions**:
1. Verify `netlify.toml` syntax is correct
2. Check that function file exists in correct directory
3. Ensure function is deployed (check Netlify deploy logs)
4. Verify cron schedule: `0 9 * * *`

### Issue: Authentication Errors

**Symptoms**: 401/403 errors in function logs

**Solutions**:
1. Check environment variables in Netlify dashboard
2. Verify Supabase URL format: `https://your-project-ref.supabase.co`
3. Confirm anon key is valid and not expired
4. Test API key manually with curl

### Issue: Database Query Failures

**Symptoms**: Database errors in function logs

**Solutions**:
1. Verify `settings` table exists in Supabase
2. Check RLS policies allow anonymous access
3. Test query manually in Supabase SQL editor
4. Ensure anon key has necessary permissions

## Emergency Procedures

### If Project Gets Paused

1. **Immediate Action**: Log into Supabase Dashboard → Resume Project
2. **Investigation**: Check Netlify function logs for failures
3. **Fix**: Resolve any issues found in troubleshooting
4. **Verification**: Test function manually
5. **Monitoring**: Ensure daily execution resumes

### Manual Heartbeat (Emergency)

Run this in your browser console or with curl:

```bash
curl -X GET \
  "https://your-project-ref.supabase.co/rest/v1/settings?select=updated_at&limit=1" \
  -H "apikey: your_anon_key" \
  -H "Authorization: Bearer your_anon_key"
```

## Backup Solutions (Optional)

### GitHub Actions Backup

Create `.github/workflows/heartbeat-backup.yml`:

```yaml
name: Supabase Heartbeat Backup

on:
  schedule:
    - cron: '0 15 * * *'  # 6 hours after primary
  workflow_dispatch:

jobs:
  heartbeat:
    runs-on: ubuntu-latest
    steps:
    - name: Execute Heartbeat
      run: |
        curl -X GET \
          "${{ secrets.SUPABASE_URL }}/rest/v1/settings?select=updated_at&limit=1" \
          -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
          -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

Add GitHub secrets:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key

## Security Best Practices

### 🔐 API Key Management

- **Never commit API keys** to version control
- **Use environment variables** exclusively
- **Rotate keys every 3-6 months**
- **Monitor for unusual activity**

### 🛡️ Access Control

- **Use anon keys** (not service keys) for automated operations
- **Implement RLS policies** on all tables
- **Audit function logs** regularly
- **Limit permissions** to minimum necessary

## Success Criteria

Your heartbeat implementation is successful when:

✅ **Function executes daily** at 9:00 AM UTC  
✅ **No authentication errors** in function logs  
✅ **Supabase dashboard shows** daily activity  
✅ **Project remains active** beyond 7 days  
✅ **Error handling works** (graceful failure handling)  
✅ **Monitoring is in place** (logs and optional database logging)  

## Timeline

| Day | Task | Status |
|-----|------|--------|
| Day 1 | Implement primary Netlify solution | ⏳ |
| Day 2 | Add optional heartbeat logging | ⏳ |
| Day 3 | Test end-to-end functionality | ⏳ |
| Day 4 | Set up monitoring procedures | ⏳ |
| Day 5 | Document and finalize | ⏳ |
| Day 7 | Verify first week of successful execution | ⏳ |
| Day 30 | Monthly review and optimization | ⏳ |

## Support Resources

### Documentation

- **Main Solution**: `SUPABASE_HEARTBEAT_SOLUTION.md`
- **Implementation Guide**: `SUPABASE_HEARTBEAT_IMPLEMENTATION_GUIDE.md`
- **Comparison Analysis**: `SUPABASE_HEARTBEAT_COMPARISON.md`

### External Resources

- [Netlify Functions Documentation](https://docs.netlify.com/edge-functions/overview/)
- [Supabase REST API Reference](https://supabase.com/docs/reference/javascript)
- [Cron Schedule Validator](https://crontab.guru/)

### Emergency Contacts

- **Netlify Support**: Through Netlify dashboard
- **Supabase Support**: Through Supabase dashboard
- **Community Forums**: GitHub Discussions, Stack Overflow

## Conclusion

By following this action plan, you'll have a robust, automated heartbeat system that keeps your Supabase project active on the free tier. The Netlify Scheduled Functions approach provides the perfect balance of simplicity, security, and reliability for your specific setup.

The implementation should take less than an hour to complete and requires minimal ongoing maintenance. Once operational, you can be confident that your Supabase project will remain active without requiring manual intervention.

**Next Step**: Begin with Step 1 of the implementation checklist and proceed through the steps sequentially. The entire process is designed to be straightforward and error-resistant.