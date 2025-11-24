import { createClient, Session, User } from '@supabase/supabase-js'; // Removed unused SupabaseClient import

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR: Supabase URL or Anon Key is missing from .env!');
  throw new Error('Missing Supabase environment variables! Check your .env file.');
}

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
    storageKey: 'sb-otscpicqgfvbaokqzaac-auth-token', // Use exact storage key format
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation', // Ensure we get data back
    },
  },
});

// Function to get and log the current session and its access token
export const getAndLogCurrentSession = async (): Promise<Session | null> => {
  // console.log('DEBUG: getAndLogCurrentSession: Attempting to get session...');
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return session;
};

// CRITICAL: Force initialize the session on page load and update client
export const initializeSupabaseSession = async (): Promise<Session | null> => {
  try {
    // console.log('DEBUG: initializeSupabaseSession called.');
    const session = await getAndLogCurrentSession(); // Use the new logging function

    if (session) {
      // console.log('DEBUG: initializeSupabaseSession: Session found, attempting to set session...');
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      // console.log('DEBUG: Supabase client session explicitly set.');
    } else {
      // console.log('DEBUG: initializeSupabaseSession: No session to explicitly set.');
    }
    return session;
  } catch (err) {
    console.error('Failed to initialize Supabase session:', err);
    return null;
  }
};

// Helper to verify connection
export const testSupabaseConnection = async () => {
  let user: User | null = null;
  let authenticated = false;
  let userData: any = null;
  let queryError: string | undefined = undefined;

  try {
    // console.log('DEBUG: testSupabaseConnection called: Attempting to get user...');
    const { data: { user: fetchedUser }, error: getUserError } = await supabase.auth.getUser();

    if (getUserError) {
      console.error('Auth test getUser error:', getUserError);
      queryError = getUserError.message;
    } else {
      user = fetchedUser;
      authenticated = !!user;
    }

    // Test a simple query to verify RLS if user is authenticated
    if (user) {
      // console.log('DEBUG: testSupabaseConnection: User found, attempting database query on "users" table...');
      const { data, error: dbQueryError } = await supabase
        .from('users')
        .select('id, email, is_admin')
        .eq('id', user.id)
        .single();

      if (dbQueryError) {
        console.error('Database query error (users table):', dbQueryError);
        queryError = dbQueryError.message;
      } else {
        userData = data;
      }
    }

    return { user, authenticated, userData, queryError };
  } catch (err) {
    console.error('Connection test failed unexpectedly:', err);
    return { user: null, authenticated: false, queryError: (err as Error).message };
  }
};