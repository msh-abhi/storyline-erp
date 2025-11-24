import React, { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import {
  LayoutDashboard, CreditCard, FileText, User, Tv, Mail,
  LogOut, Shield, ChevronRight, CheckCircle, Menu, X
} from 'lucide-react';

interface CustomerPortalLayoutProps {
  children: ReactNode;
}

const CustomerPortalLayout: React.FC<CustomerPortalLayoutProps> = ({ children }) => {
  const { signOut, userProfile, authUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/portal/login');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false); // Close mobile menu after navigation
  };

  const customerEmail = authUser?.email || 'customer@example.com';

  const navigationItems = [
    {
      path: '/portal/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Account overview'
    },
    {
      path: '/portal/subscriptions',
      label: 'My Services',
      icon: Tv,
      description: 'Subscriptions & plans'
    },
    {
      path: '/portal/billing',
      label: 'Billing History',
      icon: CreditCard,
      description: 'Payment & invoices'
    },
    {
      path: '/portal/profile',
      label: 'Account Settings',
      icon: User,
      description: 'Profile & preferences'
    },
    {
      path: '/portal/credentials',
      label: 'IPTV Credentials',
      icon: Tv,
      description: 'Streaming access'
    },
    {
      path: '/portal/contact',
      label: 'Support',
      icon: Mail,
      description: 'Help & contact'
    }
  ];

  const isActivePath = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Responsive */}
      <aside className={`
        fixed left-0 top-0 h-screen bg-white shadow-xl border-r border-gray-200 flex flex-col transition-all duration-300 z-50
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        w-64 md:w-80
      `}>
        {/* Close Button (Mobile Only) */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Logo Header */}
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">Customer Portal</h1>
              <p className="text-xs md:text-sm text-gray-500 truncate">StoryLine IPTV</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 md:py-6">
          <nav className="space-y-1 md:space-y-2 px-2 md:px-3">
            {navigationItems.map((item) => (
              <div key={item.path} className="space-y-1">
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center justify-between p-2.5 md:p-3 rounded-lg text-left transition-all duration-200 group ${isActivePath(item.path)
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 shadow-sm'
                      : 'hover:bg-gray-50 hover:shadow-sm'
                    }`}
                >
                  <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
                    <div className={`p-1.5 md:p-2 rounded-lg transition-colors flex-shrink-0 ${isActivePath(item.path)
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                      }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{item.label}</div>
                      <div className="text-xs text-gray-500 truncate hidden md:block">{item.description}</div>
                    </div>
                  </div>
                  {isActivePath(item.path) && (
                    <div className="w-1 h-6 md:h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full flex-shrink-0" />
                  )}
                </button>
              </div>
            ))}
          </nav>

          {/* Account Status - Hidden on mobile for space */}
          <div className="hidden md:block mt-8 mx-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-sm font-medium text-green-900">Account Status</h3>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">Active</div>
              <div className="text-xs text-green-600">All services running</div>
            </div>
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="p-3 md:p-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 md:space-x-3 mb-3 md:mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">
                {customerEmail?.charAt(0).toUpperCase() || 'C'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">Customer</div>
              <div className="text-xs text-gray-500 truncate">
                {customerEmail || 'Loading...'}
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center w-full p-2.5 md:p-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm text-sm md:text-base"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content - Responsive offset */}
      <div className="flex-1 flex flex-col md:ml-80">
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CustomerPortalLayout;