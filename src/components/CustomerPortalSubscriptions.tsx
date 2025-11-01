import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { subscriptionService } from '../services/supabaseService';
import { Subscription } from '../types';

const CustomerPortalSubscriptions: React.FC = () => {
  const { customerPortalUser } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customerPortalUser && customerPortalUser.customer_id) {
      const fetchSubscriptions = async () => {
        setLoading(true);
        const subs = await subscriptionService.getByCustomerId(customerPortalUser.customer_id);
        setSubscriptions(subs);
        setLoading(false);
      };
      fetchSubscriptions();
    }
  }, [customerPortalUser]);

  if (!customerPortalUser || !customerPortalUser.customer_id) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">My Subscriptions</h1>
        <p>No customer account is found for this user.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">My Subscriptions</h1>
      <p className="text-gray-600 mb-6">Here you can view all your active and past subscriptions with us.</p>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Active Subscriptions</h2>
          {subscriptions.length > 0 ? (
            <ul className="space-y-4">
              {subscriptions.map((sub) => (
                <li key={sub.id} className="bg-blue-50 p-3 rounded-md flex justify-between items-center">
                  <div>
                    <p className="font-medium text-blue-800">{sub.productName}</p>
                    <p className="text-sm text-gray-600">Starts: {sub.startDate} | Ends: {sub.endDate}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${sub.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                    {sub.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No subscriptions found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerPortalSubscriptions;