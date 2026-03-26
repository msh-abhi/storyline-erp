import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './components/AuthProvider';
import { supabase } from './lib/supabase';

// Enhanced Admin ERP Components
import TopBar from './components/TopBar';
import CustomerManagement from './components/CustomerManagement';
import ResellerManagement from './components/ResellerManagement';
import SupplierManagement from './components/SupplierManagement';
import DigitalCodeManagement from './components/DigitalCodeManagement';
import TVBoxManagement from './components/TVBoxManagement';
import EmailTemplateManagement from './components/EmailTemplateManagement';
import EmailLogs from './components/EmailLogs';
import WelcomeEmailManager from './components/WelcomeEmailManager';
import WooCommerceOrders from './components/WooCommerceOrders';
import Settings from './components/Settings';
import InvoiceManagement from './components/InvoiceManagement';
import LoginForm from './components/LoginForm';
import AdminBilling from './components/AdminBilling';

// NEW: Standardized Components
import EnhancedNavigation from './components/standardized/EnhancedNavigation';
import EnhancedUnifiedSalesModule from './components/standardized/modules/EnhancedUnifiedSalesModule';
import EnhancedUnifiedPurchaseModule from './components/standardized/modules/EnhancedUnifiedPurchaseModule';
import SubscriptionCustomerManagement from './components/standardized/modules/SubscriptionCustomerManagement';
import SubscriptionProductsManagement from './components/standardized/modules/SubscriptionProductsManagement';
import IntegrationsManagement from './components/standardized/modules/IntegrationsManagement';
import CleanDashboard from './components/standardized/modules/CleanDashboard';

// Customer Portal Components
import CustomerPortalLogin from './components/CustomerPortalLogin';
import CheckEmail from './components/CheckEmail';
import CustomerPortalAuthCallback from './components/CustomerPortalAuthCallback';
import CustomerPortalDashboard from '@/components/CustomerPortalDashboard';
import CustomerPortalSubscriptions from '@/components/CustomerPortalSubscriptions';
import CustomerPortalBilling from '@/components/CustomerPortalBilling';
import CustomerPortalProfile from '@/components/CustomerPortalProfile';
import CustomerPortalCredentials from '@/components/CustomerPortalCredentials';
import CustomerPortalContact from '@/components/CustomerPortalContact';
import CustomerPortalLayout from '@/components/CustomerPortalLayout';
import ErrorBoundary from './components/ErrorBoundary';
import MobilePayCallback from './components/MobilePayCallback';
import PublicInvoicePage from './components/PublicInvoicePage';

import { ActiveSection } from './types';

// Main AppContent component for the Admin ERP
function AdminAppContent() {
  const { authUser, isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [checkingSub, setCheckingSub] = useState(false);

  // ─── Subscription Gate ────────────────────────────────────────────────────
  useEffect(() => {
    if (!authUser || !isAdmin) return;

    const checkSubscription = async () => {
      setCheckingSub(true);
      try {
        const { data } = await supabase
          .from('admin_subscription')
          .select('status')
          .maybeSingle();

        if (data) {
          setSubStatus(data.status);
          if (data.status !== 'active' && data.status !== 'trialing') {
            setActiveSection('billing');
          }
        } else {
          // No subscription record → treat as unpaid
          setSubStatus('unpaid');
          setActiveSection('billing');
        }
      } catch (err) {
        console.error('Subscription check error:', err);
        setSubStatus('error');
        setActiveSection('billing');
      } finally {
        setCheckingSub(false);
      }
    };

    checkSubscription();
  }, [authUser, isAdmin]);

  const isLocked = isAdmin && subStatus !== 'active' && subStatus !== 'trialing';

  const renderActiveSection = () => {
    const currentView: ActiveSection = isLocked ? 'billing' : activeSection;

    switch (currentView) {
      case 'dashboard':
        return <CleanDashboard onSectionChange={setActiveSection} />;
      case 'analytics':
        return <CleanDashboard onSectionChange={setActiveSection} />;
      case 'customers':
        return <CustomerManagement />;
      case 'resellers':
        return <ResellerManagement />;
      case 'digital-codes':
        return <DigitalCodeManagement />;
      case 'tv-boxes':
        return <TVBoxManagement />;
      case 'sales':
        return <EnhancedUnifiedSalesModule />;
      case 'subscription-products':
        return <SubscriptionProductsManagement />;
      case 'subscriptions':
        return <SubscriptionCustomerManagement />;
      case 'purchases':
        return <EnhancedUnifiedPurchaseModule />;
      case 'suppliers':
        return <SupplierManagement />;
      case 'invoices':
        return <InvoiceManagement />;
      case 'email-templates':
        return <EmailTemplateManagement />;
      case 'email-logs':
        return <EmailLogs />;
      case 'welcome-emails':
        return <WelcomeEmailManager />;
      case 'woocommerce-orders':
        return <WooCommerceOrders />;
      case 'billing':
        return <AdminBilling />;
      case 'settings':
        return <Settings />;
      case 'integrations':
        return <IntegrationsManagement />;
      default:
        return <CleanDashboard onSectionChange={setActiveSection} />;
    }
  };

  return (
    <div className="relative min-h-screen gradient-bg">
      {/* Subscription verification overlay */}
      {checkingSub && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[200] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-xl shadow-xl border border-slate-100">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-800">Verifying license…</p>
              <p className="text-sm text-slate-500">Checking subscription status.</p>
            </div>
          </div>
        </div>
      )}

      {/* Simplified lock notification */}
      {isLocked && (
        <div className="fixed top-0 left-80 right-0 z-[40] bg-white/80 backdrop-blur-md border-b border-red-100 px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
              <span className="text-red-600 text-lg">⚠️</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 leading-tight">Subscription Required</p>
              <p className="text-xs text-slate-500">Please renew your subscription to access all features.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveSection('billing')}
              className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
            >
              Go to Billing
            </button>
          </div>
        </div>
      )}

      <div className={`fixed top-0 left-0 h-screen z-30 transition-all duration-500 ${isLocked ? 'blur-md pointer-events-none grayscale-[0.5] opacity-50' : ''}`}>
        <EnhancedNavigation
          activeSection={isLocked ? 'billing' : activeSection}
          onSectionChange={(section) => {
            if (!isLocked) {
              setActiveSection(section);
            }
          }}
        />
      </div>

      {/* Sidebar click-catcher when locked */}
      {isLocked && (
        <div 
          className="fixed top-0 left-0 w-80 h-screen z-[31] cursor-not-allowed group"
          onClick={() => alert('Access restricted. Please complete your subscription payment.')}
        >
          <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover:opacity-10 transition-opacity" />
        </div>
      )}

      <div className="ml-80 flex-1 flex flex-col min-h-screen overflow-y-auto">
        <TopBar />
        <main className={`flex-1 p-6 relative ${isLocked ? 'pt-20' : ''}`}>
          <ErrorBoundary>
            {renderActiveSection()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

// Main App component for routing and authentication logic
function App() {
  const { authUser, authInitialized, isAdmin, customerPortalUser, error } = useAuth();

  console.log('App: Component rendered, authInitialized:', authInitialized, 'authUser:', !!authUser);

  return (
    <Router>
      <Routes>
        {/* Always accessible routes */}
        <Route path="/portal/auth/callback" element={<CustomerPortalAuthCallback />} />
        <Route path="/mobilepay-callback" element={<MobilePayCallback />} />
        <Route path="/pay/invoice/:invoiceId" element={<PublicInvoicePage />} />

        {/* Routes that depend on auth initialization */}
        {authInitialized ? (
          <>
            {/* Public Routes */}
            <Route path="/portal/login" element={<CustomerPortalLogin />} />
            <Route path="/portal/auth/check-email" element={<CheckEmail />} />

            {/* Customer Portal Routes (Protected) */}
            <Route
              path="/portal/*"
              element={
                authUser && customerPortalUser && !isAdmin ? (
                  <CustomerPortalLayout>
                    <Routes>
                      <Route path="dashboard" element={<CustomerPortalDashboard />} />
                      <Route path="subscriptions" element={<CustomerPortalSubscriptions />} />
                      <Route path="billing" element={<CustomerPortalBilling />} />
                      <Route path="profile" element={<CustomerPortalProfile />} />
                      <Route path="credentials" element={<CustomerPortalCredentials />} />
                      <Route path="contact" element={<CustomerPortalContact />} />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </CustomerPortalLayout>
                ) : (
                  <Navigate to="/portal/login" replace />
                )
              }
            />

            {/* Admin ERP Routes (Protected) */}
            <Route
              path="/*"
              element={
                authUser && isAdmin ? (
                  <AdminAppContent />
                ) : authUser && customerPortalUser && !isAdmin ? (
                  <Navigate to="/portal/dashboard" replace />
                ) : (
                  <LoginForm />
                )
              }
            />
          </>
        ) : (
          /* Loading screen while auth initialises */
          <Route path="/*" element={
            <div className="min-h-screen gradient-bg flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white text-lg">Loading application...</p>
                {error && (
                  <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-200 text-sm">Error: {error}</p>
                  </div>
                )}
              </div>
            </div>
          } />
        )}
      </Routes>
    </Router>
  );
}

export default App;
