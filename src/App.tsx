import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './components/AuthProvider';

// Admin ERP Components
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';
import CustomerManagement from './components/CustomerManagement';
import ResellerManagement from './components/ResellerManagement';
import SupplierManagement from './components/SupplierManagement';
import DigitalCodeManagement from './components/DigitalCodeManagement';
import TVBoxManagement from './components/TVBoxManagement';
import SalesManagement from './components/SalesManagement';
import PurchaseManagement from './components/PurchaseManagement';
import SubscriptionManagement from './components/SubscriptionManagement';
import EmailTemplateManagement from './components/EmailTemplateManagement';
import EmailLogs from './components/EmailLogs';
import WooCommerceOrders from './components/WooCommerceOrders';
import Settings from './components/Settings';
import InvoiceManagement from './components/InvoiceManagement';
import LoginForm from './components/LoginForm'; // Existing admin login form

// New Customer Portal Components
import CustomerPortalLogin from './components/CustomerPortalLogin'; // New
import CheckEmail from './components/CheckEmail'; // New
import CustomerPortalAuthCallback from './components/CustomerPortalAuthCallback'; // New
import CustomerPortalDashboard from '@/components/CustomerPortalDashboard';
import CustomerPortalSubscriptions from '@/components/CustomerPortalSubscriptions';
import CustomerPortalBilling from '@/components/CustomerPortalBilling';
import CustomerPortalProfile from '@/components/CustomerPortalProfile';
import CustomerPortalCredentials from '@/components/CustomerPortalCredentials';
import CustomerPortalContact from '@/components/CustomerPortalContact';
import CustomerPortalLayout from '@/components/CustomerPortalLayout'; // Placeholder for customer portal layout
import ErrorBoundary from './components/ErrorBoundary';
import MobilePayCallback from './components/MobilePayCallback';
import PublicInvoicePage from './components/PublicInvoicePage'; // Import the new public invoice page

// Ensure ActiveSection type is imported
import { ActiveSection } from './types';

// Main AppContent component for the Admin ERP
function AdminAppContent() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');

  // This component assumes the user is authenticated and is an admin
  // The actual check for isAdmin is done in the main App component's routing

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard onSectionChange={setActiveSection} />;
      case 'customers':
        return <CustomerManagement />;
      case 'resellers':
        return <ResellerManagement />;
      case 'suppliers':
        return <SupplierManagement />;
      case 'digital-codes':
        return <DigitalCodeManagement />;
      case 'tv-boxes':
        return <TVBoxManagement />;
      case 'sales':
        return <SalesManagement />;
      case 'purchases':
        return <PurchaseManagement />;
      case 'subscriptions':
        return <SubscriptionManagement />;
      case 'email-templates': // FIX: Changed from 'emails' to 'email-templates' to match type
        return <EmailTemplateManagement />;
      case 'email-logs':
        return <EmailLogs />;
      case 'woocommerce-orders':
        return <WooCommerceOrders />;
      case 'settings':
        return <Settings />;
      case 'invoices':
        return <InvoiceManagement />;
      default:
        return <Dashboard onSectionChange={setActiveSection} />;
    }
  };

  return (
      <div className="relative min-h-screen gradient-bg">
        <div className="fixed top-0 left-0 h-screen z-30">
          <Sidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        </div>
        <div className="ml-64 flex-1 flex flex-col min-h-screen overflow-y-auto">
          <TopBar />
          <main className="flex-1 p-6">
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

  if (!authInitialized) {
    return (
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
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/portal/login" element={<CustomerPortalLogin />} />
        <Route path="/portal/auth/check-email" element={<CheckEmail />} />
        <Route path="/portal/auth/callback" element={<CustomerPortalAuthCallback />} />
        <Route path="/mobilepay-callback" element={<MobilePayCallback />} />
        <Route path="/pay/invoice/:invoiceId" element={<PublicInvoicePage />} />

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
      </Routes>
    </Router>
  );
}

export default App;
