import React from 'react';

const CustomerPortalSubscriptions: React.FC = () => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">My Subscriptions</h1>
      <p className="text-gray-600 mb-6">Here you can view all your active and past subscriptions with us.</p>

      <div className="border border-gray-200 rounded-lg p-4">
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Active Subscriptions (Placeholder)</h2>
        <ul className="space-y-4">
          <li className="bg-blue-50 p-3 rounded-md flex justify-between items-center">
            <div>
              <p className="font-medium text-blue-800">Premium IPTV Package</p>
              <p className="text-sm text-gray-600">Starts: 2025-01-01 | Ends: 2026-01-01</p>
            </div>
            <span className="px-3 py-1 bg-green-200 text-green-800 text-xs font-semibold rounded-full">Active</span>
          </li>
          <li className="bg-blue-50 p-3 rounded-md flex justify-between items-center">
            <div>
              <p className="font-medium text-blue-800">Basic Streaming Service</p>
              <p className="text-sm text-gray-600">Starts: 2024-06-15 | Ends: 2025-06-15</p>
            </div>
            <span className="px-3 py-1 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded-full">Expiring Soon</span>
          </li>
        </ul>
        <p className="text-sm text-gray-500 mt-4">Actual subscription data will be loaded here.</p>
      </div>
    </div>
  );
};

export default CustomerPortalSubscriptions;