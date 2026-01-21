# IPTV Credentials Fix Plan

## Problem Analysis
The IPTV credentials functionality is broken with the error:
```
Supabase insert error: {code: 'PGRST204', details: null, hint: null, message: "Could not find the 'server_id' column of 'customer_credentials' in the schema cache"}
```

## Root Cause
A recent migration (`20251202000000_rename_server_id_to_username.sql`) renamed the `server_id` column to `username` in the `customer_credentials` table, but the frontend code is still trying to use `server_id`. This mismatch is causing the insert operation to fail.

## Solution
Since you requested to revert the database migration rather than update the frontend code, we need to:

1. Create a new migration to revert `username` back to `server_id`
2. Update any RLS policies that reference `username` back to `server_id`
3. Update any views that reference `username` back to `server_id`
4. Deploy the migration to fix the database schema
5. Test that IPTV credentials can be saved properly

## Migration File Content
The migration file should be named: `project/supabase/migrations/20251217000000_revert_username_to_server_id.sql`

It should contain:
- Check if `username` column exists and revert to `server_id`
- Update any views that reference `username`
- Update RLS policies to use `server_id` instead of `username`
- Ensure the original working RLS policies from `20251128000001_fix_customer_credentials_rls.sql` are still in place
- Add appropriate comments to track the reversion

## Files That Need to Be Created/Modified
1. **NEW**: `project/supabase/migrations/20251217000000_revert_username_to_server_id.sql`
   - This will revert the database schema back to using `server_id`

## Implementation Steps
1. Switch to Code mode
2. Create the new migration file
3. Deploy the migration using the existing deployment system
4. Test the IPTV credentials functionality

## Expected Outcome
After deploying this migration:
- The `customer_credentials` table will have the `server_id` column again
- Frontend code will be able to save IPTV credentials without errors
- All existing functionality will continue to work as before the problematic migration

## Testing
After deployment, test:
1. Creating a new IPTV credential for a customer
2. Editing an existing IPTV credential
3. Viewing IPTV credentials in the customer management interface
4. Ensure no console errors related to `server_id` column