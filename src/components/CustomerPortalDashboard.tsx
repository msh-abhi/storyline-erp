import React from 'react';
import { useAuth } from './AuthProvider'; // Assuming useAuth is needed for welcome message

const CustomerPortalDashboard: React.FC = () => {
  const { customerData, portalUser } = useAuth();
  const customerName = customerData?.name || portalUser?.email || 'Customer';

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome, {customerName}!</h1>
      <p className="text-gray-600 mb-6">This is your personalized customer dashboard. Here you'll find an overview of your active services, upcoming bills, and recent activity.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder Card 1: Active Subscriptions */}
        <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
          <h2 className="text-xl font-semibold text-blue-800 mb-2">Active Subscriptions</h2>
          <p className="text-gray-700">You have <strong>X</strong> active subscriptions.</p>
          <p className="text-sm text-gray-500 mt-2">Details will appear here soon.</p>
        </div>

        {/* Placeholder Card 2: Upcoming Bills */}
        <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
          <h2 className="text-xl font-semibold text-green-800 mb-2">Upcoming Bills</h2>
          <p className="text-gray-700">Your next bill is on <strong>DD/MM/YYYY</strong> for <strong>$X.XX</strong>.</p>
          <p className="text-sm text-gray-500 mt-2">Keep an eye on your billing history.</p>
        </div>

        {/* Placeholder Card 3: Recent Activity */}
        <div className="bg-purple-50 p-4 rounded-lg shadow-sm border border-purple-200">
          <h2 className="text-xl font-semibold text-purple-800 mb-2">Recent Activity</h2>
          <ul className="list-disc list-inside text-gray-700">
            <li>Subscription renewed on DD/MM/YYYY</li>
            <li>Profile updated on DD/MM/YYYY</li>
          </ul>
          <p className="text-sm text-gray-500 mt-2">Your latest actions and updates.</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortalDashboard;