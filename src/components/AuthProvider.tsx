import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
// Import the specific User type from supabase-js if needed, distinct from your UserProfile
import { User as SupabaseAuthUser } from '@supabase/supabase-js'; // Renamed to avoid conflict
import { supabase, getCustomerPortalUserByAuthId, createCustomerPortalUser, getUserProfile } from "../services/supabaseService"; // Import getUserProfile
import { CustomerPortalUser, UserProfile } from '../types'; // Import UserProfile

type AuthContextType = {
  authUser: SupabaseAuthUser | null; // Raw Supabase auth user
  userProfile: UserProfile | null; // Profile from 'users' table
  customerPortalUser: CustomerPortalUser | null;
  authLoading: boolean;
  authInitialized: boolean;
  isAdmin: boolean;
  error: string | null; // Added error state
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Add other auth actions if they exist in your original AuthProvider
  // updateUserProfile: (profileUpdate: Partial<UserProfile>) => Promise<void>; // Example
  // updateCustomerPortalUser: (portalUpdate: Partial<CustomerPortalUser>) => Promise<void>; // Example
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authUser, setAuthUser] = useState<SupabaseAuthUser | null>(null); // Store the raw Supabase user
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // Store profile from 'users' table
  const [customerPortalUser, setCustomerPortalUser] = useState<CustomerPortalUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false); // Renamed from 'initialized' for consistency
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null); // Add error state

  // Combined function to load profile and portal user based on auth user
  const loadUserData = useCallback(async (currentAuthUser: SupabaseAuthUser | null) => {
    if (!currentAuthUser) {
      console.debug("AuthProvider: loadUserData - No auth user, clearing states.");
      setUserProfile(null);
      setIsAdmin(false);
      setCustomerPortalUser(null);
      return;
    }

    const uid = currentAuthUser.id;
    const email = currentAuthUser.email;
    console.debug("AuthProvider: loadUserData - Loading data for user:", uid);

    // Step 1: Fetch User Profile (determines isAdmin)
    let isAdminStatus = false;
    try {
      console.debug("AuthProvider: Fetching profile from 'users' table...");
      const profile = await getUserProfile(uid); // Use the new service function
      if (profile) {
        setUserProfile(profile);
        isAdminStatus = profile.is_admin ?? false;
        console.log(`AuthProvider: Profile fetched. Setting isAdmin state to: ${isAdminStatus}`);
        setIsAdmin(isAdminStatus);
      } else {
        console.warn("AuthProvider: No profile found in DB for authenticated user. Setting isAdmin=false.");
        setUserProfile(null);
        setIsAdmin(false);
      }
    } catch (profileError: any) {
      console.error("AuthProvider: ❌ Error fetching user profile:", profileError);
      setError(`Failed to load user profile: ${profileError.message}`); // Set error state
      // Still set defaults even on profile error
      setUserProfile(null);
      setIsAdmin(false);
    }

    // Step 2: Fetch/Create Customer Portal User (only if not admin)
    if (!isAdminStatus) {
      try {
        console.debug("AuthProvider: User is not admin. Checking/creating portal user...");
        let portalUser = await getCustomerPortalUserByAuthId(uid);
        if (!portalUser && email) { // Only create if no existing portal user and we have an email
          console.debug("AuthProvider: 📝 Portal user not found, creating...");
          portalUser = await createCustomerPortalUser({
            auth_id: uid, // This maps to auth_provider_id in DB
            customer_id: null, // Assuming customer_id is linked later
            email: email,
          });
          console.debug("AuthProvider: Portal user created:", portalUser);
        } else {
            console.debug("AuthProvider: Found existing portal user:", portalUser);
        }
        setCustomerPortalUser(portalUser);
      } catch (portalError: any) {
        console.error("AuthProvider: ❌ Error fetching/creating customer portal user:", portalError);
        setError(`Failed to load customer portal data: ${portalError.message}`);
        setCustomerPortalUser(null); // Clear portal user on error
      }
    } else {
      console.debug("AuthProvider: User is admin, clearing portal user state.");
      setCustomerPortalUser(null); // Ensure portal user is null for admins
    }

    console.debug("AuthProvider: loadUserData finished.");

  }, []); // Empty dependency array - relies on passed-in currentAuthUser

  // Main effect for initialization and auth state changes
  useEffect(() => {
    let isMounted = true;
    let authListener: { subscription: { unsubscribe: () => void; }; } | null = null;
    console.log('AuthProvider: Main useEffect starting.');

    setAuthLoading(true); // Start loading

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
      if (!isMounted) return;
      console.log('AuthProvider: Initial getSession completed.');
      if (sessionError) {
        console.error('AuthProvider: ❌ Initial session fetch error:', sessionError);
        setError(sessionError.message);
      }
      setAuthUser(session?.user ?? null); // Set the raw Supabase user
      await loadUserData(session?.user ?? null); // Load profile/portal based on initial session

    }).catch(err => {
      console.error('AuthProvider: ❌ Unexpected error during initial getSession:', err);
      if (isMounted) setError(err.message || 'Failed to initialize auth');
    }).finally(() => {
      if (isMounted) {
        console.log('AuthProvider: Initial processing done, setting authInitialized=true, authLoading=false.');
        setAuthInitialized(true); // Use authInitialized
        setAuthLoading(false);
      }
    });

    // Listener for subsequent changes
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
       if (!isMounted) return;
       console.log(`AuthProvider: 🔔 Auth state changed: ${event}`, { userId: session?.user?.id });

       setAuthUser(session?.user ?? null); // Update the raw Supabase user immediately

       // Reload profile/portal data based on the new auth user state
       await loadUserData(session?.user ?? null);

        // If signing out, ensure loading is false after processing
       if (event === 'SIGNED_OUT' && isMounted) {
           setAuthLoading(false);
       }
    });
    authListener = data;

    return () => {
      console.log('AuthProvider: Cleaning up main useEffect.');
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [loadUserData]); // Depend on loadUserData


  // --- signIn and signOut ---
   const signIn = useCallback(async (email: string) => {
     setAuthLoading(true); // Indicate loading during sign-in process
     setError(null);
     console.log('AuthProvider: Attempting signIn for', email);
     const { error: signInError } = await supabase.auth.signInWithOtp({ email,
        options: {
            // Ensure this redirect URL matches exactly what's in your Supabase Auth settings
            emailRedirectTo: window.location.origin
        }
     });
     setAuthLoading(false); // Stop loading after attempt
     if (signInError) {
        console.error("AuthProvider: signIn error:", signInError);
        setError(signInError.message);
        throw signInError; // Re-throw for LoginForm to catch
     }
     alert('Check your email for the login link!');
   }, []);

   const signOut = useCallback(async () => {
     setAuthLoading(true);
     setError(null);
     console.log('AuthProvider: Signing out...');
     const { error: signOutError } = await supabase.auth.signOut();
     // State will be cleared by onAuthStateChange listener
     setAuthLoading(false);
     if (signOutError) {
        console.error("AuthProvider: signOut error:", signOutError);
        setError(signOutError.message);
        throw signOutError;
     }
   }, []);

  const value: AuthContextType = {
    authUser, // Expose the raw Supabase user
    userProfile, // Expose the profile from 'users' table
    customerPortalUser,
    authLoading,
    authInitialized,
    isAdmin,
    error, // Expose error state
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};