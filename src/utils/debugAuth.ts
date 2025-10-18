import { supabase, testSupabaseConnection, getAndLogCurrentSession } from '../lib/supabase';
import { getUserProfile, getCustomerPortalUserByAuthId } from '../services/supabaseService';

/**
 * Debug utility to test authentication and data access
 * Call this from browser console: window.debugAuth()
 */
export const debugAuth = async () => {
  console.log('🔍 Starting comprehensive auth debug...');
  
  try {
    // 1. Test Supabase connection
    console.log('\n1️⃣ Testing Supabase connection...');
    const connectionTest = await testSupabaseConnection();
    console.log('Connection test result:', connectionTest);
    
    // 2. Get current session
    console.log('\n2️⃣ Getting current session...');
    const session = await getAndLogCurrentSession();
    console.log('Current session:', session);
    
    if (!session?.user) {
      console.log('❌ No authenticated user found. Please log in first.');
      return;
    }
    
    const userId = session.user.id;
    
    // 3. Test user profile access
    console.log('\n3️⃣ Testing user profile access...');
    try {
      const profile = await getUserProfile(userId);
      console.log('User profile:', profile);
      
      if (profile) {
        console.log(`✅ User is admin: ${profile.is_admin}`);
      } else {
        console.log('⚠️ No user profile found in database');
      }
    } catch (profileError) {
      console.error('❌ Error fetching user profile:', profileError);
    }
    
    // 4. Test customer portal user access
    console.log('\n4️⃣ Testing customer portal user access...');
    try {
      const portalUser = await getCustomerPortalUserByAuthId(userId);
      console.log('Customer portal user:', portalUser);
    } catch (portalError) {
      console.error('❌ Error fetching customer portal user:', portalError);
    }
    
    // 5. Test RLS policies with a simple query
    console.log('\n5️⃣ Testing RLS policies...');
    try {
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, name, email')
        .limit(5);
      
      if (customersError) {
        console.error('❌ RLS test failed (customers):', customersError);
      } else {
        console.log('✅ RLS test passed (customers):', customers);
      }
    } catch (rlsError) {
      console.error('❌ RLS test error:', rlsError);
    }
    
    // 6. Test exchange rates access
    console.log('\n6️⃣ Testing exchange rates access...');
    try {
      const { data: rates, error: ratesError } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (ratesError) {
        console.error('❌ Exchange rates test failed:', ratesError);
      } else {
        console.log('✅ Exchange rates test passed:', rates);
      }
    } catch (ratesError) {
      console.error('❌ Exchange rates test error:', ratesError);
    }
    
    console.log('\n🎉 Auth debug completed!');
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Debug failed:', errorMessage);
  }
};

// Make it available globally for browser console access
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
}
