import React from 'react';
import { useAuth } from './AuthProvider';

const CustomerPortalDashboard: React.FC = () => {
  const { userProfile, customerPortalUser } = useAuth();
  const customerName = userProfile?.name || 'Customer';

  if (!customerPortalUser || !customerPortalUser.customer_id) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome, {customerName}!</h1>
        <p>No customer account is found for this user.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome, {customerName}!</h1>
      <p className="text-gray-600 mb-6">This is your personalized customer dashboard. Here you'll find an overview of your active services, upcoming bills, and recent activity.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Real data will be fetched and displayed here */}
      </div>
    </div>
  );
};

export default CustomerPortalDashboard;