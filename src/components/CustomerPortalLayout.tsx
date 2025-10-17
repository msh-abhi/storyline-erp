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
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-800 text-white flex flex-col p-4">
        <div className="text-2xl font-bold mb-8 text-center">
          My Portal
        </div>
        <nav className="flex-1">
          <ul>
            <li className="mb-2">
              <Link to="/portal/dashboard" className="flex items-center p-2 rounded-md hover:bg-blue-700 transition-colors">
                <LayoutDashboard className="mr-3" size={20} /> Dashboard
              </Link>
            </li>
            <li className="mb-2">
              <Link to="/portal/subscriptions" className="flex items-center p-2 rounded-md hover:bg-blue-700 transition-colors">
                <CreditCard className="mr-3" size={20} /> Subscriptions
              </Link>
            </li>
            <li className="mb-2">
              <Link to="/portal/billing" className="flex items-center p-2 rounded-md hover:bg-blue-700 transition-colors">
                <FileText className="mr-3" size={20} /> Billing History
              </Link>
            </li>
            <li className="mb-2">
              <Link to="/portal/profile" className="flex items-center p-2 rounded-md hover:bg-blue-700 transition-colors">
                <User className="mr-3" size={20} /> Profile
              </Link>
            </li>
            <li className="mb-2">
              <Link to="/portal/credentials" className="flex items-center p-2 rounded-md hover:bg-blue-700 transition-colors">
                <Tv className="mr-3" size={20} /> IPTV Credentials
              </Link>
            </li>
            <li className="mb-2">
              <Link to="/portal/contact" className="flex items-center p-2 rounded-md hover:bg-blue-700 transition-colors">
                <Mail className="mr-3" size={20} /> Contact Us
              </Link>
            </li>
          </ul>
        </nav>
        <div className="mt-auto">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full p-2 rounded-md text-red-300 hover:bg-blue-700 hover:text-red-100 transition-colors"
          >
            <LogOut className="mr-3" size={20} /> Sign Out
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