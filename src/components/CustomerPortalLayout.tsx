import React, { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import {
  LayoutDashboard, CreditCard, FileText, User, Tv, Mail,
  LogOut, Shield, ChevronRight, CheckCircle
} from 'lucide-react';

interface CustomerPortalLayoutProps {
  children: ReactNode;
}

const CustomerPortalLayout: React.FC<CustomerPortalLayoutProps> = ({ children }) => {
  const { signOut, userProfile, authUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/portal/login');
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
      {/* Enhanced Sidebar with ERP styling */}
      <aside className="bg-white shadow-xl border-r border-gray-200 flex flex-col h-full transition-all duration-300 w-80">
        {/* Logo Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Customer Portal</h1>
              <p className="text-sm text-gray-500">StoryLine IPTV</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6">
          <nav className="space-y-2 px-3">
            {navigationItems.map((item) => (
              <div key={item.path} className="space-y-1">
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 group ${
                    isActivePath(item.path)
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 shadow-sm'
                      : 'hover:bg-gray-50 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg transition-colors ${
                      isActivePath(item.path)
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                    }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                  </div>
                  {isActivePath(item.path) && (
                    <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                  )}
                </button>
              </div>
            ))}
          </nav>

          {/* Account Status */}
          <div className="mt-8 mx-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
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
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
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
            className="flex items-center justify-center w-full p-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CustomerPortalLayout;