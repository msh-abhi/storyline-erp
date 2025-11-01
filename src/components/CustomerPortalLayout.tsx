import React, { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { LayoutDashboard, CreditCard, FileText, User, Tv, Mail, LogOut } from 'lucide-react';

interface CustomerPortalLayoutProps {
  children: ReactNode;
}

const CustomerPortalLayout: React.FC<CustomerPortalLayoutProps> = ({ children }) => {
  const { signOut, userProfile, authUser } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/portal/login');
  };

  // const customerName = userProfile?.email?.split('@')[0] || authUser?.email?.split('@')[0] || 'Customer'; // Unused variable
  const customerEmail = authUser?.email || 'customer@example.com';

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* Fixed Sidebar */}
      <aside className="w-64 bg-gray-900 text-gray-400 flex flex-col h-screen overflow-y-auto fixed top-0 left-0 z-50">
        <div className="text-center py-6">
          <h1 className="text-xl font-bold text-white tracking-wider">Customer Portal</h1>
          <div className="w-16 h-px bg-gray-600 mx-auto my-2"></div>
          <p className="text-xs text-gray-500">StoryLine</p>
        </div>
        <nav className="flex-1 space-y-2">
          <Link to="/portal/dashboard" className="flex items-center p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200">
            <LayoutDashboard className="mr-4" size={22} />
            <span>Dashboard</span>
          </Link>
          <Link to="/portal/subscriptions" className="flex items-center p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200">
            <CreditCard className="mr-4" size={22} />
            <span>Subscriptions</span>
          </Link>
          <Link to="/portal/billing" className="flex items-center p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200">
            <FileText className="mr-4" size={22} />
            <span>Billing History</span>
          </Link>
          <Link to="/portal/profile" className="flex items-center p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200">
            <User className="mr-4" size={22} />
            <span>Profile</span>
          </Link>
          <Link to="/portal/credentials" className="flex items-center p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200">
            <Tv className="mr-4" size={22} />
            <span>IPTV Credentials</span>
          </Link>
          <Link to="/portal/contact" className="flex items-center p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200">
            <Mail className="mr-4" size={22} />
            <span>Contact Us</span>
          </Link>
        </nav>
        <div className="mt-auto pt-4 border-t border-gray-700">
          <div className="text-center mb-4 p-3 bg-gray-800 rounded-lg">
            <p className="text-sm font-semibold text-gray-300">Signed in as</p>
            <p className="text-sm text-gray-300 truncate" title={customerEmail}>{customerEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center w-full p-3 rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors duration-200"
          >
            <LogOut className="mr-2" size={20} />
            <span className="font-bold">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content - Now with left margin for fixed sidebar */}
      <div className="flex-1 flex flex-col ml-64">
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CustomerPortalLayout;