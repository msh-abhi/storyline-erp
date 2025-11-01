import React, { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { LayoutDashboard, CreditCard, FileText, User, Tv, Mail, LogOut } from 'lucide-react';

interface CustomerPortalLayoutProps {
  children: ReactNode;
}

const CustomerPortalLayout: React.FC<CustomerPortalLayoutProps> = ({ children }) => {
  const { signOut, customerData, portalUser } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/portal/login');
  };

  const customerName = customerData?.name || portalUser?.email || 'Customer';

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-gray-400 flex flex-col p-4 shadow-lg">
        <div className="text-center py-6">
          <h1 className="text-3xl font-extrabold text-white tracking-wider">Customer Portal</h1>
          <p className="text-xs text-gray-500 mt-1">StoryLine</p>
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
            <p className="text-base font-bold text-white truncate" title={portalUser?.email}>{portalUser?.email}</p>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">Welcome, {customerName}!</h1>
          {/* You can add more header elements here, e.g., notifications */}
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CustomerPortalLayout;