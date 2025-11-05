import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';
import { subscriptionService, getCustomerMessages, getCustomerCredentials, customerService } from '../services/supabaseService';
import {
  CreditCard,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Tv,
  TrendingUp,
  DollarSign,
  Activity,
  Zap,
  MessageSquare,
  ExternalLink,
  Settings
} from 'lucide-react';

interface DashboardStats {
  activeSubscriptions: number;
  nextPayment: string;
  daysUntilRenewal: number;
  totalSpent: number;
  supportTickets: number;
  serviceStatus: 'healthy' | 'warning' | 'critical';
  nextPaymentAmount: number;
}

interface RecentActivity {
  id: string;
  type: 'payment' | 'subscription' | 'ticket' | 'device';
  title: string;
  description: string;
  timestamp: string;
  status?: 'completed' | 'pending' | 'failed' | 'unknown';
}

const CustomerPortalDashboard: React.FC = () => {
  const { userProfile, customerPortalUser, authUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    activeSubscriptions: 0,
    nextPayment: '',
    daysUntilRenewal: 0,
    totalSpent: 0,
    supportTickets: 0,
    serviceStatus: 'healthy',
    nextPaymentAmount: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const customerName = userProfile?.email?.split('@')[0] || authUser?.email?.split('@')[0] || 'Customer';
  const customerEmail = authUser?.email || 'customer@example.com';
  // customerEmail is used for email-related displays throughout the component

  // Use type assertion to access the camelCase properties after keysToCamel conversion
  const portalUser = customerPortalUser as any;
  const hasCustomer = portalUser?.customerId && portalUser?.customerId !== null;

  useEffect(() => {
    if (hasCustomer) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [hasCustomer]);

  const loadDashboardData = async () => {
    try {
      const customerId = portalUser.customerId;
      
      // Load real customer data
      const [subscriptions, messages, credentials, _customerInfo] = await Promise.all([
        subscriptionService.getByCustomerId(customerId),
        getCustomerMessages(customerId),
        getCustomerCredentials(customerId),
        customerService.getById(customerId)
      ]);

      console.log('Dashboard - Loaded subscriptions:', subscriptions);
      console.log('Dashboard - Subscription details:', subscriptions.map(sub => ({
        id: sub.id,
        status: sub.status,
        endDate: sub.endDate,
        price: sub.price,
        productName: sub.productName,
        durationMonths: sub.durationMonths
      })));

      // Calculate real statistics with proper date handling
      const now = new Date();
      
      // Count all valid subscriptions (active or pending, but not expired)
      const validSubscriptionsList = subscriptions.filter(sub => {
        try {
          const endDate = new Date(sub.endDate);
          return (sub.status === 'active' || sub.status === 'pending') && !isNaN(endDate.getTime()) && endDate > now;
        } catch (e) {
          console.warn('Invalid subscription date:', sub.endDate, e);
          return false;
        }
      });

      const activeSubscriptions = validSubscriptionsList.length;
      
      // Find next payment date (earliest end date of valid subscriptions)
      const nextPaymentData = validSubscriptionsList
        .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())[0];
      
      const nextPaymentDate = nextPaymentData?.endDate || '';
      const daysUntilRenewal = nextPaymentDate ? Math.ceil((new Date(nextPaymentDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const nextPaymentAmount = nextPaymentData?.price || 0;

      // Calculate total spent (sum of subscription prices)
      const totalSpent = subscriptions
        .filter(sub => sub.price)
        .reduce((sum, sub) => sum + (sub.price || 0), 0);

      // Count support messages
      const supportTickets = messages.filter(msg => msg.status === 'open').length;

      // Determine service status based on subscription health
      let serviceStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (daysUntilRenewal <= 5) serviceStatus = 'critical';
      else if (daysUntilRenewal <= 10) serviceStatus = 'warning';

      setStats({
        activeSubscriptions,
        nextPayment: nextPaymentDate,
        daysUntilRenewal,
        totalSpent,
        supportTickets,
        serviceStatus,
        nextPaymentAmount
      });

      // Generate activity from real data
      const activityItems: RecentActivity[] = [];

      // Add subscription activities
      subscriptions.slice(0, 2).forEach(sub => {
        const timestamp = sub.updatedAt || sub.createdAt;
        activityItems.push({
          id: `sub-${sub.id}`,
          type: 'subscription',
          title: 'Subscription Updated',
          description: `${sub.productName || 'IPTV Package'} ${sub.status}`,
          timestamp: timestamp || new Date().toISOString(),
          status: 'completed'
        });
      });

      // Add support message activities
      messages.slice(0, 2).forEach(msg => {
        const timestamp = msg.created_at;
        activityItems.push({
          id: `msg-${msg.id}`,
          type: 'ticket',
          title: 'Support Message',
          description: msg.subject || 'Support contact',
          timestamp: timestamp || new Date().toISOString(),
          status: msg.status === 'open' ? 'pending' : 'completed'
        });
      });

      // Add credential activities
      credentials.slice(0, 1).forEach(cred => {
        const timestamp = cred.created_at;
        activityItems.push({
          id: `cred-${cred.id}`,
          type: 'device',
          title: 'Device Credentials',
          description: `Server: ${cred.server_id}`,
          timestamp: timestamp || new Date().toISOString(),
          status: 'completed'
        });
      });

      setRecentActivity(activityItems.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-DK', {
      style: 'currency',
      currency: 'DKK'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No due date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-DK', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('Invalid date format:', dateString);
      return 'Invalid date';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payment': return <DollarSign size={16} className="text-green-500" />;
      case 'subscription': return <Tv size={16} className="text-blue-500" />;
      case 'ticket': return <MessageSquare size={16} className="text-orange-500" />;
      case 'device': return <Zap size={16} className="text-purple-500" />;
      default: return <Activity size={16} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-orange-600 bg-orange-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!customerPortalUser || !hasCustomer) {
    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Welcome, {customerName}!</h1>
          <p className="text-blue-100">No customer account is found for this user.</p>
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">Please contact support to set up your customer account.</p>
            <p className="text-sm text-yellow-600 mt-2">
              Debug info: Portal User ID: {portalUser?.id || 'None'}, 
              Customer ID: {portalUser?.customerId || 'None'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading State */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-8 text-white">
          <div className="animate-pulse">
            <div className="h-8 bg-blue-500 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-blue-500 rounded w-2/3"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header - Enhanced with ERP styling */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 rounded-xl p-8 text-white shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-3">Welcome back, {customerName}!</h1>
            <p className="text-blue-100 text-lg">Here's what's happening with your account today.</p>
            <div className="mt-4 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-blue-200">All systems operational</span>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-sm text-blue-200 mb-1">Account Status</p>
              <div className="flex items-center justify-end">
                <CheckCircle size={16} className="text-green-300 mr-2" />
                <span className="font-semibold text-green-300">Active</span>
              </div>
              <p className="text-xs text-blue-300 mt-1">Since {new Date().getFullYear()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row - Enhanced with ERP styling */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Subscriptions Card */}
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <Tv className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Services</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeSubscriptions}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm font-medium text-green-600">
                {stats.activeSubscriptions} service{stats.activeSubscriptions !== 1 ? 's' : ''} active
              </span>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Next Payment Card */}
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Next Payment</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.nextPaymentAmount > 0 ? formatCurrency(stats.nextPaymentAmount) : 'No due'}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-orange-500 mr-2" />
              <span className="text-sm font-medium text-orange-600">
                {stats.nextPayment ? formatDate(stats.nextPayment) : 'No upcoming'}
              </span>
            </div>
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          </div>
        </div>

        {/* Total Spent Card */}
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Spent</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalSpent)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm font-medium text-green-600">Lifetime value</span>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        </div>

        {/* Support Tickets Card */}
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
              <MessageSquare className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Support</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.supportTickets}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-purple-600">
                {stats.supportTickets === 0 ? 'No open tickets' :
                 `${stats.supportTickets} open ticket${stats.supportTickets !== 1 ? 's' : ''}`}
              </span>
            </div>
            <div className={`w-2 h-2 rounded-full ${stats.supportTickets === 0 ? 'bg-green-500' : 'bg-orange-500'}`}></div>
          </div>
        </div>
      </div>

      {/* Main Content Grid - Enhanced with ERP styling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <p className="text-sm text-gray-500">Your latest account updates</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/portal/activity')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              View All <ExternalLink size={14} className="ml-1" />
            </button>
          </div>
          <div className="space-y-3">
            {recentActivity.length > 0 ? recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-xl transition-all duration-200 group border border-transparent hover:border-gray-200">
                <div className="flex-shrink-0 mt-1 p-2 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(activity.status || 'unknown')}`}>
                      {activity.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(activity.timestamp).toLocaleDateString('en-DK', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity</p>
                <p className="text-sm text-gray-400">Your account activity will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Service Status - Enhanced with ERP styling */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Settings className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                <p className="text-sm text-gray-500">Common tasks</p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/portal/billing')}
                className="w-full flex items-center p-4 text-left bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all duration-200 group border border-blue-200 hover:border-blue-300"
              >
                <div className="p-2 bg-blue-100 rounded-lg mr-4 group-hover:bg-blue-200 transition-colors">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900 group-hover:text-blue-700">Pay Bill</p>
                  <p className="text-sm text-blue-600">View and pay invoices</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/portal/subscriptions')}
                className="w-full flex items-center p-4 text-left bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl transition-all duration-200 group border border-green-200 hover:border-green-300"
              >
                <div className="p-2 bg-green-100 rounded-lg mr-4 group-hover:bg-green-200 transition-colors">
                  <Tv className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-900 group-hover:text-green-700">Manage Services</p>
                  <p className="text-sm text-green-600">Subscriptions & plans</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/portal/contact')}
                className="w-full flex items-center p-4 text-left bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl transition-all duration-200 group border border-purple-200 hover:border-purple-300"
              >
                <div className="p-2 bg-purple-100 rounded-lg mr-4 group-hover:bg-purple-200 transition-colors">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-purple-900 group-hover:text-purple-700">Contact Support</p>
                  <p className="text-sm text-purple-600">Get help & assistance</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/portal/profile')}
                className="w-full flex items-center p-4 text-left bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl transition-all duration-200 group border border-gray-200 hover:border-gray-300"
              >
                <div className="p-2 bg-gray-100 rounded-lg mr-4 group-hover:bg-gray-200 transition-colors">
                  <Settings className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-gray-700">Account Settings</p>
                  <p className="text-sm text-gray-600">Profile & preferences</p>
                </div>
              </button>
            </div>
          </div>

          {/* Service Status - Enhanced with ERP styling */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
                  <p className="text-sm text-gray-500">All systems operational</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 animate-pulse ${
                  stats.serviceStatus === 'healthy' ? 'bg-green-400' :
                  stats.serviceStatus === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                }`}></div>
                <span className="text-sm font-medium text-gray-600 capitalize">{stats.serviceStatus}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <CheckCircle size={16} className="text-green-500 mr-3" />
                  <span className="text-sm font-medium text-green-800">Streaming Service</span>
                </div>
                <span className="text-xs text-green-600 font-medium">Online</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <CheckCircle size={16} className="text-green-500 mr-3" />
                  <span className="text-sm font-medium text-green-800">Payment System</span>
                </div>
                <span className="text-xs text-green-600 font-medium">Operational</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <CheckCircle size={16} className="text-green-500 mr-3" />
                  <span className="text-sm font-medium text-green-800">Support System</span>
                </div>
                <span className="text-xs text-green-600 font-medium">Available</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                Last updated: {new Date().toLocaleTimeString('en-DK')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Notifications & Alerts */}
      {stats.daysUntilRenewal > 0 && stats.daysUntilRenewal <= 30 && (
        <div className={`border rounded-lg p-4 ${
          stats.daysUntilRenewal <= 5
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-start">
            <AlertCircle className={`h-5 w-5 mr-3 mt-0.5 ${
              stats.daysUntilRenewal <= 5 ? 'text-red-400' : 'text-yellow-400'
            }`} />
            <div>
              <h4 className={`text-sm font-medium ${
                stats.daysUntilRenewal <= 5 ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {stats.daysUntilRenewal <= 5 ? 'Urgent: Service Expiring Soon' : 'Upcoming Renewal Reminder'}
              </h4>
              <p className={`text-sm mt-1 ${
                stats.daysUntilRenewal <= 5 ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {stats.daysUntilRenewal <= 5
                  ? `Your subscription expires in ${stats.daysUntilRenewal} days. Please renew immediately to avoid service interruption.`
                  : `Your subscription will renew in ${stats.daysUntilRenewal} days ${stats.nextPayment ? `on ${formatDate(stats.nextPayment)}` : ''}.`
                }
              </p>
              <button
                onClick={() => navigate('/portal/billing')}
                className={`mt-2 text-sm font-medium underline ${
                  stats.daysUntilRenewal <= 5
                    ? 'text-red-800 hover:text-red-900'
                    : 'text-yellow-800 hover:text-yellow-900'
                }`}
              >
                Review payment details →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert for Active Subscriptions */}
      {stats.activeSubscriptions > 0 && stats.daysUntilRenewal > 10 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-800">All Services Active</h4>
              <p className="text-sm text-green-700 mt-1">
                You have {stats.activeSubscriptions} active subscription{stats.activeSubscriptions !== 1 ? 's' : ''} with no upcoming renewals in the next 10 days.
              </p>
              <button
                onClick={() => navigate('/portal/subscriptions')}
                className="mt-2 text-sm font-medium text-green-800 hover:text-green-900 underline"
              >
                View all subscriptions →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPortalDashboard;