import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { toast } from 'react-toastify';
import { supabase, testSupabaseConnection, getAndLogCurrentSession } from '../lib/supabase';
import {
  signInWithMagicLink,
  updateCustomerPortalUser as updateCustomerPortalUserService,
  getUserProfile,
  getCustomerPortalUserByAuthId,
  createCustomerPortalUser,
  updateUserProfileService, // FIX: Import the new service
} from '../services/supabaseService';
import { CustomerPortalUser, UserProfile } from '../types';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  customerPortalUser: CustomerPortalUser | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateCustomerPortalUser: (user: Partial<CustomerPortalUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [customerPortalUser, setCustomerPortalUser] = useState<CustomerPortalUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Helper function to process a session and update state
  const processSession = useCallback(async (session: Session | null) => {
    setLoading(true);
    setError(null);

    if (!session) {
      console.log('AuthProvider: No active session, clearing user state.');
      setUser(null);
      setIsAdmin(false);
      setCustomerPortalUser(null);
      setUserProfile(null);
      setLoading(false);
      return;
    }

    console.log('AuthProvider: Processing session for user ID:', session.user.id);
    setUser(session.user);

    await getAndLogCurrentSession();
    const { user: supabaseUser, authenticated, userData, queryError } = await testSupabaseConnection();
    console.log('AuthProvider: DEBUG: Detailed database query test result (users table):', { authenticated, userData, queryError });

    if (!authenticated || !supabaseUser) {
      console.log('AuthProvider: ℹ️ User not authenticated or profile not found after connection test. Clearing state.');
      setUser(null);
      setIsAdmin(false);
      setCustomerPortalUser(null);
      setUserProfile(null);
      setLoading(false);
      return;
    }

    console.log('AuthProvider: 👤 Loading user profile for:', supabaseUser.id);
    try {
      const profile = await getUserProfile(supabaseUser.id);
      setUserProfile(profile);
      setIsAdmin(profile?.is_admin ?? false);

      console.log('AuthProvider: ✅ User profile loaded:', {
        userId: supabaseUser.id,
        email: supabaseUser.email,
        isAdmin: profile?.is_admin,
      });

      if (!profile?.is_admin) {
        let portalUser = await getCustomerPortalUserByAuthId(supabaseUser.id);
        if (!portalUser) {
          console.log('AuthProvider: 📝 Creating customer portal user...');
          portalUser = await createCustomerPortalUser({
            auth_id: supabaseUser.id,
            customer_id: null,
            email: supabaseUser.email || '',
          });
        }
        setCustomerPortalUser(portalUser);
      }
    } catch (err: any) {
      console.error('AuthProvider: ❌ Error loading user profile or portal user:', err);
      setError(err.message || 'Failed to load user data.');
      setUser(null);
      setIsAdmin(false);
      setCustomerPortalUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('AuthProvider: 🚀 Initializing authentication on mount...');

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        await processSession(session);

      } catch (err: any) {
        console.error('AuthProvider: ❌ Initial auth setup error:', err);
        setError(err.message || 'Failed to initialize authentication');
        setUser(null);
        setIsAdmin(false);
        setCustomerPortalUser(null);
        setUserProfile(null);
      } finally {
        setInitialized(true);
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: 🔔 Auth state changed:', event, session?.user?.id);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log(`AuthProvider: Handling ${event} event, re-processing session...`);
        await processSession(session);
      } else if (event === 'SIGNED_OUT') {
        console.log('AuthProvider: User signed out, clearing session...');
        await processSession(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [processSession]);

  const signIn = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithMagicLink(email);
      toast.success("Magic link sent! Check your email.");
    } catch (err: any) {
      setError(err.message || "Failed to send magic link.");
      toast.error(`Login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await supabase.auth.signOut();
      toast.info("You have been signed out.");
    } catch (err: any) {
      setError(err.message || "Failed to sign out.");
      toast.error(`Logout failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (profile: Partial<UserProfile>) => {
    if (!userProfile) {
      setError("No user profile found to update.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updatedProfile = await updateUserProfileService(userProfile.id, profile); // FIX: Use new service
      setUserProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ...updatedProfile,
          is_admin: updatedProfile.is_admin, // FIX: is_admin is now guaranteed boolean from service
        };
      });
      toast.success("User profile updated!");
    } catch (err: any) {
      setError(err.message || "Failed to update user profile.");
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateCustomerPortalUser = async (userData: Partial<CustomerPortalUser>) => {
    if (!customerPortalUser) {
      setError("No customer portal user found to update.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updatedUser = await updateCustomerPortalUserService(customerPortalUser.id, userData);
      setCustomerPortalUser(prev => ({ ...prev!, ...updatedUser }));
      toast.success("Customer portal user updated!");
    } catch (err: any) {
      setError(err.message || "Failed to update customer portal user.");
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    customerPortalUser,
    userProfile,
    isAdmin,
    loading,
    error,
    initialized,
    signIn,
    signOut,
    updateUserProfile,
    updateCustomerPortalUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};