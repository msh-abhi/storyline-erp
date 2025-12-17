# IPTV Credentials Fix - Deployment Instructions

## Status
✅ Migration file created: `20251217000000_revert_username_to_server_id.sql`
⏳ Deployment in progress - waiting for database password

## What the Migration Does
The migration file I created will:
1. **Revert column name**: Change `username` back to `server_id` in `customer_credentials` table
2. **Update views**: Recreate any views that reference the column to use `server_id`
3. **Update RLS policies**: Recreate Row Level Security policies to use `server_id` instead of `username`
4. **Restore working policies**: Ensure the original working RLS policies from `20251128000001_fix_customer_credentials_rls.sql` are in place

## How to Complete Deployment
The deployment script is currently waiting for your database password. To complete the fix:

1. **Run the deployment command** (if not already running):
   ```bash
   cd project
   node deploy-migrations.cjs deploy
   ```

2. **Enter your Supabase database password** when prompted

3. **Verify the migration was applied**:
   - Look for output: `✓ Migration 20251217000000_revert_username_to_server_id.sql applied successfully`
   - Check final summary shows 1 migration applied

## Alternative: Manual Deployment via Supabase Dashboard
If the script doesn't work, you can manually apply the migration:

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `project/supabase/migrations/20251217000000_revert_username_to_server_id.sql`
4. Execute the SQL

## Verification Steps
After deployment, test the IPTV credentials functionality:

1. Navigate to Customer Management in your app
2. Click on any customer to open their details
3. Go to the "IPTV Credentials" tab
4. Try adding a new credential with:
   - Server URL: `https://test.example.com`
   - User Name: `testuser`
   - Password: `testpass`
5. Check browser console - should NOT show the "Could not find the 'server_id' column" error
6. Verify the credential appears in the list after saving

## Expected Outcome
After successful deployment:
- ✅ No more "Could not find the 'server_id' column" errors
- ✅ IPTV credentials can be created, edited, and deleted
- ✅ All existing functionality restored

## Troubleshooting
If you still see errors after deployment:
1. Check that the migration actually applied (check migration status)
2. Verify the column name in the database schema
3. Check browser console for any new error messages