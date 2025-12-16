import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const handler = async (event: any, context: any) => {
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
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    };
  }
};
