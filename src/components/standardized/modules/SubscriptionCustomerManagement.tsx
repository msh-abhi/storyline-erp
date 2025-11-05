import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Calendar, AlertCircle, User, ExternalLink, DollarSign } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../components/AuthProvider';
import { Subscription, Customer } from '../../../types';
import { formatCurrency } from '../../../utils/calculations';
import { getDaysUntilExpiry } from '../../../utils/subscriptionUtils';

interface CustomerWithSubscription extends Customer {
  subscription?: Subscription;
  customerName?: string;
}

const SubscriptionCustomerManagement: React.FC = () => {
  const { state, actions } = useApp();
  const { authUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    startDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'mobilepay' as 'mobilepay' | 'revolut' | 'manual',
  });

  // Filter customers who have subscriptions
  const customersWithSubscriptions: CustomerWithSubscription[] = state.customers
    .map(customer => {
      const subscription = state.subscriptions?.find(sub => sub.customerId === customer.id);
      return subscription ? { ...customer, subscription } : null;
    })
    .filter(Boolean) as CustomerWithSubscription[];

  // Filter by search term
  const filteredCustomers = customersWithSubscriptions.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeSubscriptions = state.subscriptions?.filter(s => s.status === 'active') || [];
  const expiringSubscriptions = activeSubscriptions.filter(s => getDaysUntilExpiry(s.endDate) <= 10);

  const handleEdit = (subscription: Subscription) => {
    const customer = state.customers.find(c => c.id === subscription.customerId);
    setEditingSubscription(subscription);
    setFormData({
      customerId: subscription.customerId,
      productId: subscription.productId || '',
      startDate: subscription.startDate.split('T')[0],
      paymentMethod: subscription.paymentMethod || 'manual',
    });
    setShowForm(true);
  };

  const handleDelete = async (subscriptionId: string) => {
    if (confirm('Are you sure you want to delete this subscription?')) {
      try {
        await actions.deleteSubscription(subscriptionId);
        alert('Subscription deleted successfully!');
      } catch (error) {
        console.error('Error deleting subscription:', error);
        alert('Failed to delete subscription. Please try again.');
      }
    }
  };

  const formatCurrencyWithState = (amount: number) => {
    const currency = state.settings?.displayCurrency || 'DKK';
    return formatCurrency(amount, currency, null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const customer = state.customers.find(c => c.id === formData.customerId);
      const product = state.subscriptionProducts?.find(p => p.id === formData.productId);

      if (!customer || !product) {
        alert('Please select a valid customer and subscription product.');
        return;
      }

      // Calculate end date based on product duration
      const startDate = new Date(formData.startDate);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + product.durationMonths);

      const subscriptionData = {
        customerId: formData.customerId,
        productId: formData.productId,
        productName: product.name,
        price: product.price,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        paymentMethod: formData.paymentMethod,
        status: 'active' as const,
        durationMonths: product.durationMonths,
        reminder10Sent: false,
        reminder5Sent: false,
      };

      if (editingSubscription) {
        // Update existing subscription
        await actions.updateSubscription(editingSubscription.id, subscriptionData);
        alert('Subscription updated successfully!');
      } else {
        // Create new subscription
        await actions.createSubscription(subscriptionData);
        alert('Subscription added successfully!');
      }

      // Reset form and close modal
      setShowForm(false);
      setEditingSubscription(null);
      setFormData({
        customerId: '',
        productId: '',
        startDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'mobilepay',
      });

    } catch (error) {
      console.error('Error saving subscription:', error);
      alert(`Error saving subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Subscriptions</h1>
            <p className="text-gray-600">Manage customer subscriptions and renewals</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Subscription</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-200 rounded-full">
                <User className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{filteredCustomers.length}</p>
                <p className="text-sm text-blue-700">Customers with Subscriptions</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-200 rounded-full">
                <AlertCircle className="h-6 w-6 text-orange-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-900">{expiringSubscriptions.length}</p>
                <p className="text-sm text-orange-700">Expiring Soon</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-200 rounded-full">
                <DollarSign className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrencyWithState(
                    activeSubscriptions.reduce((total, sub) => total + sub.price, 0)
                  )}
                </p>
                <p className="text-sm text-green-700">Monthly Revenue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers with subscriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Active Subscriptions</h2>
        </div>
        
        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No customer subscriptions found</p>
            <p className="text-gray-400">Add your first customer subscription to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => {
                  const subscription = customer.subscription!;
                  const subscriptionProduct = state.subscriptionProducts?.find(p => p.id === subscription.productId);
                  const daysLeft = getDaysUntilExpiry(subscription.endDate);
                  const invoice = state.invoices?.find(inv => inv.id === subscription.invoiceId);
                  
                  return (
                    <tr key={subscription.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-500">{customer.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {subscriptionProduct ? subscriptionProduct.name : (subscription.productName || 'Unknown')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {subscriptionProduct ? `${subscriptionProduct.durationMonths} month${subscriptionProduct.durationMonths > 1 ? 's' : ''}` : (subscription.durationMonths ? `${subscription.durationMonths} month${subscription.durationMonths > 1 ? 's' : ''}` : 'N/A')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                        {formatCurrencyWithState(subscription.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        <div>
                          {new Date(subscription.endDate).toLocaleDateString('en-DK')}
                          {daysLeft <= 7 && daysLeft > 0 && (
                            <div className="text-xs text-amber-600 font-medium">
                              {daysLeft} days left
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                          subscription.status === 'expired' ? 'bg-red-100 text-red-800' :
                          subscription.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {subscription.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            subscription.paymentMethod === 'mobilepay' ? 'bg-blue-100 text-blue-800' :
                            subscription.paymentMethod === 'revolut' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {subscription.paymentMethod}
                          </span>
                          {invoice?.paymentLink && (
                            <a href={invoice.paymentLink} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-700">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(subscription)}
                            className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit subscription"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(subscription.id)}
                            className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete subscription"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Subscription Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingSubscription ? 'Edit Subscription' : 'Add New Subscription'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer *
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a customer</option>
                    {state.customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription Product *
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a product</option>
                    {state.subscriptionProducts?.filter(product => product.isActive).map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {formatCurrencyWithState(product.price)} ({product.durationMonths} months)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as 'mobilepay' | 'revolut' | 'manual' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="mobilepay">MobilePay</option>
                    <option value="revolut">Revolut</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingSubscription(null);
                    setFormData({
                      customerId: '',
                      productId: '',
                      startDate: new Date().toISOString().split('T')[0],
                      paymentMethod: 'mobilepay',
                    });
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingSubscription ? 'Update Subscription' : 'Add Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionCustomerManagement;
