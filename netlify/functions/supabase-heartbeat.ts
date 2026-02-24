import { createClient } from '@supabase/supabase-js';

// Netlify Functions environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Heartbeat Error: Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const handler = async (event: any, context: any) => {
  const currentTimestamp = new Date().toISOString();

  try {
    console.log('Starting Supabase heartbeat at:', currentTimestamp);

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables are not configured in Netlify');
    }

    // Update the heartbeat timestamp in the most recent settings record
    // This counts as active database activity to prevent project pausing
    const { data: settingsRow } = await supabase
      .from('settings')
      .select('id')
      .limit(1)
      .single();

    let updateStatus = 'no_settings_row';
    let data = null;

    if (settingsRow) {
      const { data: updateData, error: updateError } = await supabase
        .from('settings')
        .update({ last_heartbeat_at: currentTimestamp })
        .eq('id', settingsRow.id)
        .select()
        .single();

      if (updateError) {
        console.error('Heartbeat update failed:', updateError);
        updateStatus = 'error: ' + updateError.message;
      } else {
        updateStatus = 'success';
        data = updateData;
      }
    }

    // Log the heartbeat activity to a dedicated table
    const { error: logError } = await supabase
      .from('heartbeat_logs')
      .insert({
        executed_at: currentTimestamp,
        status: updateStatus,
        error_message: updateStatus === 'success' ? null : `Update failed or no row found: ${updateStatus}`
      });

    if (logError) {
      console.warn('Failed to log heartbeat activity to heartbeat_logs:', logError);
    }

    console.log(`Heartbeat finished with status: ${updateStatus}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: updateStatus === 'success',
        status: updateStatus,
        timestamp: currentTimestamp,
        data: data
      })
    };

  } catch (error) {
    console.error('Heartbeat function fatal error:', error);

    // Attempt one last log if possible
    try {
      await supabase.from('heartbeat_logs').insert({
        executed_at: currentTimestamp,
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown fatal error'
      });
    } catch (e) { }

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: currentTimestamp
      })
    };
  }
};
