import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

const CustomerPortalAuthCallback: React.FC = () => {
  const { user, portalUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user && portalUser) {
        // User is authenticated and identified as a portal user
        navigate('/portal/dashboard', { replace: true });
      } else if (user && !portalUser) {
        // User is authenticated but not recognized as a portal user (e.g., admin trying to access portal callback)
        // Or portal_enabled is false for this customer.
        // In this case, we should log them out or redirect to a generic error/info page.
        // For now, let's redirect to the main login, which will handle admin vs customer.
        console.warn('Authenticated user is not a recognized customer portal user. Redirecting to main login.');
        navigate('/', { replace: true });
      } else {
        // Not authenticated, redirect to portal login
        navigate('/portal/login', { replace: true });
      }
    }
  }, [user, portalUser, loading, navigate]);

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Logging you in...</p>
      </div>
    </div>
  );
};

export default CustomerPortalAuthCallback;