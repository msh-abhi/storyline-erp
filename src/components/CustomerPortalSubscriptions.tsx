import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { subscriptionService } from '../services/supabaseService';
import { Subscription } from '../types';
import {
  Calendar, Clock, AlertTriangle, CheckCircle,
  Tv, CreditCard, Shield, TrendingUp, ExternalLink
} from 'lucide-react';

const CustomerPortalSubscriptions: React.FC = () => {
  const { customerPortalUser, authUser } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Use type assertion to access the camelCase properties after keysToCamel conversion
  const portalUser = customerPortalUser as any;
  const hasCustomer = portalUser?.customerId && portalUser?.customerId !== null;
  const customerName = authUser?.email?.split('@')[0] || 'Customer';

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
    if (daysLeft <= 0) return {
      status: 'expired',
      label: 'Expired',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: AlertTriangle,
      bgColor: 'bg-gradient-to-br from-red-50 to-red-100',
      borderColor: 'border-l-red-500'
    };
    if (daysLeft <= 5) return {
      status: 'urgent',
      label: 'Expires Soon',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: AlertTriangle,
      bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100',
      borderColor: 'border-l-orange-500'
    };
    if (daysLeft <= 10) return {
      status: 'reminder',
      label: 'Upcoming Renewal',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: Clock,
      bgColor: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
      borderColor: 'border-l-yellow-500'
    };
    return {
      status: 'active',
      label: 'Active',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle,
      bgColor: 'bg-gradient-to-br from-green-50 to-green-100',
      borderColor: 'border-l-green-500'
    };
  };

  if (!customerPortalUser || !hasCustomer) {
    return (
      <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-blue-50 rounded-xl">
            <Tv className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Subscriptions</h1>
            <p className="text-gray-500">Manage your service subscriptions</p>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">Account Setup Required</h3>
          </div>
          <p className="text-yellow-700 mb-4">No customer account is found for this user.</p>
          <div className="bg-yellow-100 rounded-lg p-3">
            <p className="text-sm text-yellow-600">
              <strong>Debug info:</strong> Portal User ID: {portalUser?.id || 'None'},
              Customer ID: {portalUser?.customerId || 'None'}
            </p>
          </div>
          <button className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
            Contact Support
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-gray-200 rounded-xl w-12 h-12"></div>
            <div>
              <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 border border-gray-200 rounded-xl">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 rounded-xl">
            <Tv className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Subscriptions</h1>
            <p className="text-gray-500">Manage your service subscriptions</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">{subscriptions.length} service{subscriptions.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Subscriptions List */}
      {subscriptions.length > 0 ? (
        <div className="space-y-6">
          {subscriptions.map((sub) => {
            const reminderStatus = getReminderStatus(sub);
            const IconComponent = reminderStatus.icon;
            const daysLeft = getDaysUntilExpiry(sub.endDate);
            
            return (
              <div key={sub.id} className={`p-6 rounded-xl border-l-4 ${reminderStatus.borderColor} ${reminderStatus.bgColor} hover:shadow-lg transition-all duration-300`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {/* Header with icon and status */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg ${reminderStatus.status === 'active' ? 'bg-green-200' : reminderStatus.status === 'urgent' || reminderStatus.status === 'expired' ? 'bg-red-200' : 'bg-yellow-200'}`}>
                        <IconComponent size={20} className={reminderStatus.status === 'active' ? 'text-green-600' : reminderStatus.status === 'urgent' || reminderStatus.status === 'expired' ? 'text-red-600' : 'text-yellow-600'} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{sub.productName}</h3>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${reminderStatus.color}`}>
                          {reminderStatus.label}
                        </span>
                      </div>
                    </div>
                    
                    {/* Date Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-3 p-3 bg-white/50 rounded-lg">
                        <Calendar size={16} className="text-blue-600" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Start Date</p>
                          <p className="font-medium text-gray-900">{new Date(sub.startDate).toLocaleDateString('en-DK', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-white/50 rounded-lg">
                        <Clock size={16} className="text-purple-600" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">End Date</p>
                          <p className="font-medium text-gray-900">{new Date(sub.endDate).toLocaleDateString('en-DK', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Alerts */}
                    {daysLeft > 0 && daysLeft <= 10 && (
                      <div className={`p-4 rounded-lg border ${daysLeft <= 5 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle size={16} className={daysLeft <= 5 ? 'text-red-600' : 'text-yellow-600'} />
                          <span className={`font-semibold ${daysLeft <= 5 ? 'text-red-800' : 'text-yellow-800'}`}>
                            {daysLeft <= 5 ? 'Urgent: Service Expiring Soon' : 'Upcoming Renewal Reminder'}
                          </span>
                        </div>
                        <p className={`text-sm ${daysLeft <= 5 ? 'text-red-700' : 'text-yellow-700'}`}>
                          {daysLeft <= 5
                            ? `Your subscription expires in ${daysLeft} days. Please renew immediately to avoid service interruption.`
                            : `Your subscription will renew in ${daysLeft} days.`}
                        </p>
                      </div>
                    )}
                    
                    {daysLeft <= 0 && (
                      <div className="p-4 rounded-lg border bg-red-50 border-red-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle size={16} className="text-red-600" />
                          <span className="font-semibold text-red-800">Service Has Expired</span>
                        </div>
                        <p className="text-sm text-red-700">Please contact support to restore service.</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Price and Payment Info */}
                  <div className="text-right ml-6">
                    <div className="p-4 bg-white/80 rounded-xl border border-white/50 backdrop-blur-sm">
                      <div className="text-2xl font-bold text-gray-900 mb-2">
                        {sub.price ? `${sub.price} DKK` : 'Contact for pricing'}
                      </div>
                      <div className="flex items-center space-x-2 mb-3">
                        <CreditCard size={16} className="text-gray-500" />
                        <span className="text-sm text-gray-600 capitalize">{sub.paymentMethod || 'manual'}</span>
                      </div>
                      
                      {/* Payment Status Badge */}
                      <div className="space-y-2">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          sub.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            : sub.status === 'active'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : sub.status === 'expired'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {sub.status === 'pending' ? 'Payment Pending' :
                           sub.status === 'active' ? 'Active' :
                           sub.status === 'expired' ? 'Expired' :
                           sub.status || 'Unknown'}
                        </span>
                        
                        {sub.status === 'pending' && (
                          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-xs text-yellow-700">
                              ⚠️ Payment required to activate service
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="p-4 bg-gray-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <Tv className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Subscriptions Found</h3>
          <p className="text-gray-500 mb-6">You don't have any active subscriptions at the moment.</p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2 mx-auto">
            <ExternalLink size={16} />
            <span>Browse Services</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerPortalSubscriptions;