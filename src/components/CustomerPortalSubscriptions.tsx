import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { subscriptionService } from '../services/supabaseService';
import { Subscription } from '../types';
import { Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

const CustomerPortalSubscriptions: React.FC = () => {
  const { customerPortalUser } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Use type assertion to access the camelCase properties after keysToCamel conversion
  const portalUser = customerPortalUser as any;
  const hasCustomer = portalUser?.customerId && portalUser?.customerId !== null;

  useEffect(() => {
    if (portalUser && portalUser.customerId) {
      const fetchSubscriptions = async () => {
        setLoading(true);
        const subs = await subscriptionService.getByCustomerId(portalUser.customerId);
        setSubscriptions(subs);
        setLoading(false);
      };
      fetchSubscriptions();
    }
  }, [customerPortalUser]);
  // Helper function to calculate days until expiry
  const getDaysUntilExpiry = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Helper function to get reminder status
  const getReminderStatus = (subscription: Subscription) => {
    const daysLeft = getDaysUntilExpiry(subscription.endDate);
    if (daysLeft <= 0) return { status: 'expired', label: 'Expired', color: 'bg-red-200 text-red-800', icon: AlertTriangle };
    if (daysLeft <= 5) return { status: 'urgent', label: 'Expires Soon', color: 'bg-orange-200 text-orange-800', icon: AlertTriangle };
    if (daysLeft <= 10) return { status: 'reminder', label: 'Upcoming Renewal', color: 'bg-yellow-200 text-yellow-800', icon: Clock };
    return { status: 'active', label: 'Active', color: 'bg-green-200 text-green-800', icon: CheckCircle };
  };

  if (!customerPortalUser || !hasCustomer) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">My Subscriptions</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No customer account is found for this user.</p>
          <p className="text-sm text-yellow-600 mt-2">
            Debug info: Portal User ID: {portalUser?.id || 'None'},
            Customer ID: {portalUser?.customerId || 'None'}
          </p>
        </div>
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
              {subscriptions.map((sub) => {
                const reminderStatus = getReminderStatus(sub);
                const IconComponent = reminderStatus.icon;
                const daysLeft = getDaysUntilExpiry(sub.endDate);
                
                return (
                  <li key={sub.id} className={`p-4 rounded-lg border-l-4 ${reminderStatus.status === 'urgent' ? 'border-l-red-500 bg-red-50' : reminderStatus.status === 'reminder' ? 'border-l-yellow-500 bg-yellow-50' : reminderStatus.status === 'expired' ? 'border-l-red-500 bg-red-50' : 'border-l-green-500 bg-blue-50'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <IconComponent size={20} className={reminderStatus.status === 'urgent' ? 'text-red-600' : reminderStatus.status === 'reminder' ? 'text-yellow-600' : reminderStatus.status === 'expired' ? 'text-red-600' : 'text-green-600'} />
                          <h3 className="font-medium text-gray-800">{sub.productName}</h3>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${reminderStatus.color}`}>
                            {reminderStatus.label}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            <span>Start: {new Date(sub.startDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={16} />
                            <span>End: {new Date(sub.endDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        {daysLeft > 0 && daysLeft <= 10 && (
                          <div className={`mt-2 text-sm font-medium ${daysLeft <= 5 ? 'text-red-700' : 'text-yellow-700'}`}>
                            <div className="flex items-center gap-1">
                              <AlertTriangle size={14} />
                              <span>{daysLeft} days remaining until expiry</span>
                            </div>
                            {daysLeft <= 5 && (
                              <p className="text-xs mt-1">🚨 Urgent: Please renew soon to avoid service interruption</p>
                            )}
                            {daysLeft > 5 && daysLeft <= 10 && (
                              <p className="text-xs mt-1">⏰ Renewal reminders have been sent</p>
                            )}
                          </div>
                        )}
                        
                        {daysLeft <= 0 && (
                          <div className="mt-2 text-sm text-red-700 font-medium">
                            <div className="flex items-center gap-1">
                              <AlertTriangle size={14} />
                              <span>Service has expired</span>
                            </div>
                            <p className="text-xs mt-1">Please contact support to restore service</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-gray-800">{sub.price ? `${sub.price} DKK` : 'Contact for pricing'}</p>
                        <div className="mt-1">
                          <p className="text-xs text-gray-500 capitalize">{sub.paymentMethod || 'manual'}</p>
                          {/* Payment Status Badge */}
                          <div className="mt-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              sub.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : sub.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : sub.status === 'expired'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {sub.status === 'pending' ? 'Payment Pending' :
                               sub.status === 'active' ? 'Active' :
                               sub.status === 'expired' ? 'Expired' :
                               sub.status || 'Unknown'}
                            </span>
                          </div>
                          {sub.status === 'pending' && (
                            <p className="text-xs text-yellow-600 mt-1">
                              ⚠️ Payment required to activate service
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
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