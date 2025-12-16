import { createClient } from '@supabase/supabase-js';

// Netlify Functions environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Type declarations for Netlify Functions
declare const process: {
  env: {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
  };
};

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const handler = async (event: any, context: any) => {
  try {
    console.log('Starting Supabase heartbeat at:', new Date().toISOString());
    
    const currentTimestamp = new Date().toISOString();
    
    // Update the heartbeat timestamp in settings table
    const { data, error } = await supabase
      .from('settings')
      .update({
        last_heartbeat_at: currentTimestamp
      })
      .eq('id', 1) // Assuming there's a single settings record with id=1
      .select('updated_at, last_heartbeat_at')
      .single();
    
    if (error && error.code !== 'PGRST116') { // Ignore "not found" errors
      console.error('Heartbeat update failed:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: error.message,
          timestamp: currentTimestamp
        })
      };
    }
    
    // Optional: Log the heartbeat activity to a dedicated table
    try {
      await supabase
        .from('heartbeat_logs')
        .insert({
          executed_at: currentTimestamp,
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
        timestamp: currentTimestamp,
        lastActivity: data?.updated_at,
        lastHeartbeat: data?.last_heartbeat_at
      })
    };
    
  } catch (error) {
    console.error('Heartbeat function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    };
  }
};
