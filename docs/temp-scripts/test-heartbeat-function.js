const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  console.log('Make sure these are set in your .env file or Netlify environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testHeartbeatFunction() {
  console.log('Testing heartbeat function logic...\n');

  try {
    const currentTimestamp = new Date().toISOString();
    console.log('1. Current timestamp:', currentTimestamp);

    // Test updating settings table
    console.log('\n2. Testing settings table update...');
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .update({
        last_heartbeat_at: currentTimestamp
      })
      .eq('id', 1)
      .select('updated_at, last_heartbeat_at')
      .single();

    if (settingsError) {
      console.log('❌ Settings update failed:');
      console.log('   Error:', settingsError.message);
      console.log('   Code:', settingsError.code);
      console.log('   Details:', settingsError.details);
      
      if (settingsError.code === 'PGRST116') {
        console.log('ℹ️  No settings record with id=1 found. Trying to create one...');
        
        const { data: newSettings, error: createError } = await supabase
          .from('settings')
          .insert({
            id: 1,
            last_heartbeat_at: currentTimestamp,
            company_name: 'Default Company'
          })
          .select('updated_at, last_heartbeat_at')
          .single();

        if (createError) {
          console.log('❌ Settings creation failed:', createError.message);
        } else {
          console.log('✅ Settings record created successfully');
          console.log('   Updated at:', newSettings.updated_at);
          console.log('   Last heartbeat:', newSettings.last_heartbeat_at);
        }
      }
    } else {
      console.log('✅ Settings updated successfully');
      console.log('   Updated at:', settingsData.updated_at);
      console.log('   Last heartbeat:', settingsData.last_heartbeat_at);
    }

    // Test heartbeat_logs table
    console.log('\n3. Testing heartbeat_logs table...');
    const { data: logsData, error: logsError } = await supabase
      .from('heartbeat_logs')
      .insert({
        executed_at: currentTimestamp,
        status: 'success'
      })
      .select('id, executed_at, status')
      .single();

    if (logsError) {
      console.log('❌ Heartbeat log insertion failed:');
      console.log('   Error:', logsError.message);
      console.log('   Code:', logsError.code);
    } else {
      console.log('✅ Heartbeat log inserted successfully');
      console.log('   Log ID:', logsData.id);
      console.log('   Executed at:', logsData.executed_at);
      console.log('   Status:', logsData.status);
    }

    // Test reading heartbeat data
    console.log('\n4. Testing heartbeat data read...');
    const { data: recentLogs, error: readError } = await supabase
      .from('heartbeat_logs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(5);

    if (readError) {
      console.log('❌ Reading heartbeat logs failed:', readError.message);
    } else {
      console.log(`✅ Found ${recentLogs.length} recent heartbeat logs`);
      recentLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.executed_at} - ${log.status}`);
      });
    }

    // Test reading settings with heartbeat
    console.log('\n5. Testing settings read with heartbeat...');
    const { data: settingsRead, error: settingsReadError } = await supabase
      .from('settings')
      .select('id, last_heartbeat_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (settingsReadError) {
      console.log('❌ Reading settings failed:', settingsReadError.message);
    } else {
      console.log('✅ Settings read successfully');
      if (settingsRead && settingsRead.length > 0) {
        const setting = settingsRead[0];
        console.log('   Settings ID:', setting.id);
        console.log('   Last heartbeat:', setting.last_heartbeat_at);
        console.log('   Updated at:', setting.updated_at);
      } else {
        console.log('ℹ️  No settings records found');
      }
    }

    console.log('\n=== Heartbeat Function Test Complete ===');
    console.log('\nIf all tests passed, your heartbeat function should work correctly.');
    console.log('Next steps:');
    console.log('1. Deploy the Netlify function');
    console.log('2. Test it through Netlify dashboard');
    console.log('3. Check the Settings page in your app');

  } catch (error) {
    console.error('Unexpected error during test:', error);
  }
}

// Run the test
testHeartbeatFunction();