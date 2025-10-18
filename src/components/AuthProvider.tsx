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
import { supabase } from '../lib/supabase'; // Import supabase from the correct location
import { getCustomerPortalUserByAuthId, createCustomerPortalUser, getUserProfile } from "../services/supabaseService"; // Import service functions
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

    try {
      // Step 1: Fetch User Profile (determines isAdmin)
      let isAdminStatus = false;
      console.debug("AuthProvider: Fetching profile from 'users' table...");
      const profile = await getUserProfile(uid);
      
      if (profile) {
        setUserProfile(profile);
        isAdminStatus = profile.isAdmin ?? false;
        console.log(`AuthProvider: Profile fetched. Setting isAdmin state to: ${isAdminStatus}`);
        setIsAdmin(isAdminStatus);
      } else {
        console.warn("AuthProvider: No profile found in DB for authenticated user. Setting isAdmin=false.");
        setUserProfile(null);
        setIsAdmin(false);
      }

      // Step 2: Fetch/Create Customer Portal User (only if not admin)
      if (!isAdminStatus) {
        console.debug("AuthProvider: User is not admin. Checking/creating portal user...");
        let portalUser = await getCustomerPortalUserByAuthId(uid);
        if (!portalUser && email) {
          console.debug("AuthProvider: 📝 Portal user not found, creating...");
          portalUser = await createCustomerPortalUser({
            authProviderId: uid,
            customerId: null,
            email: email,
          } as any);
          console.debug("AuthProvider: Portal user created:", portalUser);
        } else {
          console.debug("AuthProvider: Found existing portal user:", portalUser);
        }
        setCustomerPortalUser(portalUser);
      } else {
        console.debug("AuthProvider: User is admin, clearing portal user state.");
        setCustomerPortalUser(null);
      }

      console.debug("AuthProvider: loadUserData finished successfully.");
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("AuthProvider: ❌ Error in loadUserData:", error);
      setError(`Failed to load user data: ${errorMessage}`);
      
      // Set safe defaults on error
      setUserProfile(null);
      setIsAdmin(false);
      setCustomerPortalUser(null);
      
      // Re-throw to let calling code handle if needed
      throw error;
    }
  }, []); // Empty dependency array - relies on passed-in currentAuthUser

  // Main effect for initialization and auth state changes
  useEffect(() => {
    let isMounted = true;
    let authListener: { subscription: { unsubscribe: () => void; }; } | null = null;
    console.log('AuthProvider: Main useEffect starting.');

    // Don't reinitialize if already initialized
    if (authInitialized) {
      console.log('AuthProvider: Already initialized, skipping re-initialization.');
      return;
    }

    setAuthLoading(true); // Start loading
    setError(null); // Clear any previous errors

    // Initial session check with better error handling
    const initializeAuth = async () => {
      try {
        console.log('AuthProvider: Getting initial session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        console.log('AuthProvider: Initial getSession completed.', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          error: sessionError?.message 
        });
        
        if (sessionError) {
          console.error('AuthProvider: ❌ Initial session fetch error:', sessionError);
          setError(sessionError.message);
          // Don't return early, continue with null session
        }
        
        setAuthUser(session?.user ?? null); // Set the raw Supabase user
        
        // Load user data if we have a session
        if (session?.user) {
          await loadUserData(session.user);
        } else {
          // Clear all user data if no session
          setUserProfile(null);
          setIsAdmin(false);
          setCustomerPortalUser(null);
        }
        
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('AuthProvider: ❌ Unexpected error during initial getSession:', err);
        if (isMounted) {
          setError(errorMessage || 'Failed to initialize auth');
          // Clear all states on error
          setAuthUser(null);
          setUserProfile(null);
          setIsAdmin(false);
          setCustomerPortalUser(null);
        }
      } finally {
        if (isMounted) {
          console.log('AuthProvider: Initial processing done, setting authInitialized=true, authLoading=false.');
          setAuthInitialized(true);
          setAuthLoading(false);
        }
      }
    };

    initializeAuth();

    // Listener for subsequent changes
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
       if (!isMounted) return;
       console.log(`AuthProvider: 🔔 Auth state changed: ${event}`, { 
         userId: session?.user?.id,
         event 
       });

       setAuthUser(session?.user ?? null); // Update the raw Supabase user immediately
       setError(null); // Clear errors on auth state change

       // Handle different auth events
       if (event === 'SIGNED_IN' && session?.user) {
         console.log('AuthProvider: User signed in, loading user data...');
         setAuthLoading(true);
         await loadUserData(session.user);
         setAuthLoading(false);
       } else if (event === 'SIGNED_OUT') {
         console.log('AuthProvider: User signed out, clearing all data...');
         setUserProfile(null);
         setIsAdmin(false);
         setCustomerPortalUser(null);
         setAuthLoading(false);
       } else if (event === 'TOKEN_REFRESHED' && session?.user) {
         console.log('AuthProvider: Token refreshed, ensuring user data is loaded...');
         // Only reload if we don't have user profile data
         if (!userProfile) {
           await loadUserData(session.user);
         }
       } else if (event === 'INITIAL_SESSION' && session?.user) {
         console.log('AuthProvider: Initial session detected, loading user data...');
         await loadUserData(session.user);
       }
    });
    authListener = data;

    return () => {
      console.log('AuthProvider: Cleaning up main useEffect.');
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [loadUserData, authInitialized]); // Depend on loadUserData and authInitialized


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