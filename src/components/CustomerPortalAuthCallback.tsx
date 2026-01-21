import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider'; // Correctly import useAuth

export default function CustomerPortalAuthCallback() {
  const navigate = useNavigate();
  const { authInitialized, authUser, customerPortalUser, authLoading } = useAuth();

  useEffect(() => {
    console.log('[AuthCallback] Checking status:', {
      authInitialized,
      hasAuthUser: !!authUser,
      hasPortalUser: !!customerPortalUser,
      isLoading: authLoading
    });

    // Don't do anything until AuthProvider has finished initializing
    if (!authInitialized) {
      console.log('[AuthCallback] Waiting for AuthProvider to initialize...');
      return;
    }

    // If still loading user data, wait a bit but not forever
    if (authLoading) {
      console.log('[AuthCallback] Waiting for user data to load...');
      // Set a timeout to redirect anyway after 3 seconds if still loading
      const timeout = setTimeout(() => {
        if (authUser) {
          console.log('[AuthCallback] Timeout reached, redirecting anyway...');
          navigate('/portal/dashboard', { replace: true });
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }

    console.log('[AuthCallback] Auth is initialized. Checking user status...', {
      isAuthUser: !!authUser,
      isPortalUser: !!customerPortalUser,
    });

    // After initialization and loading, we can decide where to send the user.
    if (authUser && customerPortalUser) {
      // If we have both the auth user and the portal user, login was successful.
      console.log('[AuthCallback] User is fully authenticated. Redirecting to dashboard...');
      navigate('/portal/dashboard', { replace: true });
    } else if (authUser && !customerPortalUser) {
      // If we have auth user but no portal user, it might be an admin user or there's an issue
      console.log('[AuthCallback] User has auth but no portal user. Checking if admin...');
      // This could be an admin user, so redirect to admin dashboard
      navigate('/dashboard', { replace: true });
    } else {
      // If anything is missing after initialization, the login failed or is incomplete.
      console.warn('[AuthCallback] User not fully authenticated after init. Redirecting to login.');
      navigate('/portal/login', { replace: true });
    }
  }, [authInitialized, authUser, customerPortalUser, authLoading, navigate]);

  // Display a generic loading screen while we wait for the AuthProvider.
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Finalizing login...</p>
        {authLoading && <p className="text-white text-sm mt-2">Loading user data...</p>}
      </div>
    </div>
  );
}
