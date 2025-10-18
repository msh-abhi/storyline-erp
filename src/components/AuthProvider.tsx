import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { supabase, getCustomerPortalUserByAuthId, createCustomerPortalUser } from "../services/supabaseService"; // Import new service functions
import { CustomerPortalUser } from '../types'; // Import CustomerPortalUser type

type UserProfile = {
  id: string;
  email?: string | null;
  is_admin?: boolean;
};

type AuthContextType = {
  user: UserProfile | null;
  customerPortalUser: CustomerPortalUser | null; // ADDED: Customer Portal User
  authLoading: boolean;      // true while supabase auth is resolving
  authInitialized: boolean;  // becomes true after first auth check completes
  isAdmin: boolean;
  // Add other auth actions if they exist in your original AuthProvider
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  // ... any other actions like signUp, resetPassword, etc.
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [customerPortalUser, setCustomerPortalUser] = useState<CustomerPortalUser | null>(null); // ADDED: State for customer portal user
  const [authLoading, setAuthLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Helper: load profile from your "users" table (or whichever table you use)
  const loadProfile = useCallback(async (uid: string | null, email: string | null) => {
    if (!uid) {
      console.debug("AuthProvider: loadProfile called with no uid -> clearing user");
      setUser(null);
      setIsAdmin(false);
      setCustomerPortalUser(null); // Clear portal user too
      return;
    }
    try {
      console.debug("AuthProvider: loading profile for uid", uid);
      const { data, error } = await supabase
        .from("users")
        .select("id, email, is_admin")
        .eq("id", uid)
        .limit(1)
        .single(); // Use .maybeSingle() if your Supabase SDK supports it and you expect 0 rows

      if (error) {
        console.warn("AuthProvider: loadProfile error", error);
        setUser({ id: uid, email: email }); // Set basic user even on profile error
        setIsAdmin(false);
      } else if (data) {
        setUser({ id: data.id, email: data.email, is_admin: data.is_admin });
        setIsAdmin(!!data.is_admin);
        console.debug("AuthProvider: ✅ User profile loaded:", data);
      } else {
        // no row found in public.users table
        setUser({ id: uid, email: email });
        setIsAdmin(false);
        console.debug("AuthProvider: no profile row found; user exists in auth but not in users table");
      }

      // --- Logic for Customer Portal User ---
      if (!isAdmin) { // Only try to load/create portal user if not an admin
        console.debug("AuthProvider: User is not admin, checking/creating portal user...");
        let portalUser = await getCustomerPortalUserByAuthId(uid);
        if (!portalUser && email) { // Only create if no existing portal user and we have an email
          console.debug("AuthProvider: 📝 Creating customer portal user...");
          portalUser = await createCustomerPortalUser({
            auth_id: uid,
            customer_id: null, // Assuming customer_id is linked later
            email: email,
          });
        }
        setCustomerPortalUser(portalUser);
        console.debug("AuthProvider: Portal user set:", portalUser);
      } else {
        setCustomerPortalUser(null); // Clear portal user if admin
        console.debug("AuthProvider: User is admin, portal user cleared.");
      }
      // --- End Customer Portal User Logic ---

    } catch (err) {
      console.error("AuthProvider: unexpected error loading profile or portal user", err);
      setUser({ id: uid, email: email });
      setIsAdmin(false);
      setCustomerPortalUser(null);
    }
  }, [isAdmin]); // isAdmin is a dependency because portal user logic depends on it

  // process session -> load profile
  const processSession = useCallback(
    async (sessionData: any) => {
      if (!sessionData?.user?.id) {
        console.debug("AuthProvider: No session to process, clearing user state.");
        setUser(null);
        setIsAdmin(false);
        setCustomerPortalUser(null); // Clear portal user too
        return;
      }
      const uid = sessionData.user.id;
      const email = sessionData.user.email;
      console.debug("AuthProvider: processSession - user id:", uid);
      await loadProfile(uid, email);
    },
    [loadProfile]
  );

  useEffect(() => {
    let mounted = true;
    // Declare authListener outside the IIFE so it's accessible in the cleanup function
    let authListener: { subscription: { unsubscribe: () => void; }; } | null = null;

    (async () => {
      try {
        console.debug("AuthProvider: 🚀 Initializing authentication...");
        setAuthLoading(true);

        const { data: sessionRes } = await supabase.auth.getSession();
        console.debug("AuthProvider: getSession result:", sessionRes);
        await processSession(sessionRes?.session ?? sessionRes);

        // subscribe to auth changes
        const { data } = supabase.auth.onAuthStateChange( // Get the data object directly
          async (event, session) => {
            console.debug(`AuthProvider: onAuthStateChange event=${event}`, { session });
            if (!mounted) return;
            try {
              await processSession(session ?? {});
            } catch (err) {
              console.error("AuthProvider: error in onAuthStateChange handler", err);
            } finally {
              // Important: always ensure loading flag is cleared after event processed
              if (mounted) setAuthLoading(false);
            }
          }
        );
        authListener = data; // Assign the listener data to the outer variable

        // mark initialized (first pass complete)
        if (mounted) {
          setAuthInitialized(true);
        }
      } catch (err) {
        console.error("AuthProvider: initialization error", err);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();

    return () => {
      mounted = false;
      // Use the outer variable to unsubscribe
      authListener?.subscription?.unsubscribe();
    };
  }, [processSession]); // processSession is a dependency

  // --- Add your existing signIn, signOut, etc. functions here ---
  // Example placeholder functions:
  const signIn = useCallback(async (email: string) => {
    console.log('AuthProvider: Attempting signIn for', email);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
    alert('Check your email for the login link!');
  }, []);

  const signOut = useCallback(async () => {
    console.log('AuthProvider: Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setIsAdmin(false);
    setCustomerPortalUser(null); // Clear portal user on sign out
    setAuthInitialized(false); // Reset initialized state on sign out
    setAuthLoading(false);
  }, []);
  // --- End of placeholder functions ---


  const value: AuthContextType = {
    user,
    customerPortalUser, // ADDED: Expose customerPortalUser
    authLoading,
    authInitialized,
    isAdmin,
    signIn,
    signOut,
    // ... other actions
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};