const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMigrations() {
  console.log('Checking heartbeat migrations...\n');

  try {
    // Check if heartbeat_logs table exists
    console.log('1. Checking heartbeat_logs table...');
    const { data: heartbeatLogsTable, error: logsError } = await supabase
      .from('heartbeat_logs')
      .select('id')
      .limit(1);

    if (logsError) {
      console.log('❌ heartbeat_logs table does not exist or has permission issues:');
      console.log('   Error:', logsError.message);
      console.log('   Solution: Apply migration 20251216000000_create_heartbeat_logs.sql');
    } else {
      console.log('✅ heartbeat_logs table exists and is accessible');
    }

    // Check if last_heartbeat_at column exists in settings table
    console.log('\n2. Checking last_heartbeat_at column in settings table...');
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('last_heartbeat_at')
      .limit(1);

    if (settingsError) {
      console.log('❌ last_heartbeat_at column does not exist or has permission issues:');
      console.log('   Error:', settingsError.message);
      console.log('   Solution: Apply migration 20251216000001_add_heartbeat_field_to_settings.sql');
    } else {
      console.log('✅ last_heartbeat_at column exists and is accessible');
    }

    // Check if there are any existing heartbeat logs
    console.log('\n3. Checking existing heartbeat data...');
    const { data: existingLogs, error: existingLogsError } = await supabase
      .from('heartbeat_logs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(5);

    if (existingLogsError) {
      console.log('❌ Cannot access heartbeat_logs data:', existingLogsError.message);
    } else if (existingLogs && existingLogs.length > 0) {
      console.log(`✅ Found ${existingLogs.length} recent heartbeat logs`);
      existingLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.executed_at} - ${log.status}${log.error_message ? ' (Error: ' + log.error_message + ')' : ''}`);
      });
    } else {
      console.log('ℹ️  No heartbeat logs found yet (expected if heartbeat hasn\'t run)');
    }

    // Check settings table for heartbeat timestamp
    console.log('\n4. Checking settings for heartbeat timestamp...');
    const { data: settingsWithHeartbeat, error: settingsHeartbeatError } = await supabase
      .from('settings')
      .select('id, last_heartbeat_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (settingsHeartbeatError) {
      console.log('❌ Cannot access settings table:', settingsHeartbeatError.message);
    } else if (settingsWithHeartbeat && settingsWithHeartbeat.length > 0) {
      const setting = settingsWithHeartbeat[0];
      if (setting.last_heartbeat_at) {
        console.log('✅ Found heartbeat timestamp in settings:');
        console.log(`   Last heartbeat: ${setting.last_heartbeat_at}`);
        const hoursSince = (new Date() - new Date(setting.last_heartbeat_at)) / (1000 * 60 * 60);
        console.log(`   Hours since: ${hoursSince.toFixed(1)}`);
      } else {
        console.log('ℹ️  Settings table exists but no heartbeat timestamp recorded yet');
      }
    } else {
      console.log('ℹ️  No settings records found');
    }

    console.log('\n=== Migration Check Complete ===');
    console.log('\nIf any tables or columns are missing, run these commands:');
    console.log('1. supabase db push');
    console.log('2. Or apply migrations manually in Supabase dashboard');

  } catch (error) {
    console.error('Unexpected error during migration check:', error);
  }
}

// Run the check
checkMigrations();