import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider'; // Correctly import useAuth

export default function CustomerPortalAuthCallback() {
  const navigate = useNavigate();
  const { authInitialized, authUser, customerPortalUser, authLoading } = useAuth();

  useEffect(() => {
    // Don't do anything until the AuthProvider has finished its initial loading.
    if (!authInitialized) {
      console.log('[AuthCallback] Waiting for AuthProvider to initialize...');
      return;
    }

    console.log('[AuthCallback] Auth is initialized. Checking user status...', {
      isAuthUser: !!authUser,
      isPortalUser: !!customerPortalUser,
    });

    // After initialization, we can decide where to send the user.
    if (authUser && customerPortalUser) {
      // If we have both the auth user and the portal user, login was successful.
      console.log('[AuthCallback] User is fully authenticated. Redirecting to dashboard...');
      navigate('/portal/dashboard', { replace: true });
    } else {
      // If anything is missing after initialization, the login failed or is incomplete.
      console.warn('[AuthCallback] User not fully authenticated after init. Redirecting to login.');
      navigate('/portal/login', { replace: true });
    }
  }, [authInitialized, authUser, customerPortalUser, navigate]);

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
