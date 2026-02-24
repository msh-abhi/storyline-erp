import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Calendar, AlertCircle, Clock, Package, DollarSign, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../components/AuthProvider';
import { Subscription, SubscriptionProduct, SupportedCurrency } from '../types';
import { formatCurrency } from '../utils/calculations';
import { calculateSubscriptionEndDate, getDaysUntilExpiry, getSubscriptionReminderStatus } from '../utils/subscriptionUtils';
import { generateInvoice } from '../utils/invoiceGenerator';

export default function SubscriptionManagement() {
  const { state, actions } = useApp();
  const { authUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [editingProduct, setEditingProduct] = useState<SubscriptionProduct | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    customerId: '',
    subscriptionProductId: '',
    startDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'mobilepay' as 'mobilepay' | 'revolut' | 'manual', // New field
  });
  const [productFormData, setProductFormData] = useState({
    name: '',
    description: '',
    durationMonths: 1,
    price: 0,
    features: ['']
  });

  const filteredSubscriptions = state.subscriptions?.filter(subscription => {
    const customer = state.customers.find(c => c.id === subscription.customerId);
    const customerName = customer ? customer.name : '';
    return customerName.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const customer = state.customers.find(c => c.id === formData.customerId);
    const subscriptionProduct = state.subscriptionProducts?.find(p => p.id === formData.subscriptionProductId);

    if (!customer || !subscriptionProduct) {
      alert('Please select valid customer and subscription product');
      return;
    }

    const endDate = calculateSubscriptionEndDate(formData.startDate, subscriptionProduct.durationMonths);

    let newSubscription: Subscription | undefined;
    let generatedInvoiceId: string | undefined;
    let mobilepayAgreementId: string | undefined;
    let paymentLink: string | undefined;

    try {
      // First, create the subscription record
      const baseSubscriptionData: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'> = {
        customerId: formData.customerId,
        productId: formData.subscriptionProductId,
        productName: subscriptionProduct.name,
        durationMonths: subscriptionProduct.durationMonths,
        startDate: formData.startDate,
        endDate: endDate,
        price: subscriptionProduct.price,
        status: 'active',
        reminder10Sent: false,
        reminder5Sent: false,
        paymentMethod: formData.paymentMethod,
        user_id: authUser?.id || '',
      };

      if (editingSubscription) {
        await actions.updateSubscription(editingSubscription.id, baseSubscriptionData);
        newSubscription = { ...editingSubscription, ...baseSubscriptionData }; // Update local object
      } else {
        newSubscription = await actions.createSubscription(baseSubscriptionData);
      }

      if (!newSubscription) {
        throw new Error('Failed to create or update subscription.');
      }

      // Then, generate an invoice based on the payment method
      const invoiceResult = await generateInvoice({
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        amount: subscriptionProduct.price,
        currency: state.settings?.currency as SupportedCurrency || 'DKK',
        dueDate: endDate, // Due date can be end date or a specific payment date
        paymentMethod: formData.paymentMethod,
        subscription: newSubscription,
        metadata: {
          subscriptionProductId: subscriptionProduct.id,
          subscriptionProductName: subscriptionProduct.name,
        }
      });

      if (!invoiceResult.success || !invoiceResult.invoice) {
        throw new Error(invoiceResult.error || 'Failed to generate invoice.');
      }

      generatedInvoiceId = invoiceResult.invoice.id;
      paymentLink = invoiceResult.paymentLink;
      mobilepayAgreementId = invoiceResult.invoice.externalPaymentId; // If MobilePay

      // Update the subscription with the generated invoice ID and MobilePay agreement ID
      await actions.updateSubscription(newSubscription.id, {
        invoiceId: generatedInvoiceId,
        mobilepayAgreementId: mobilepayAgreementId,
        status: formData.paymentMethod === 'manual' ? 'active' : 'pending', // Manual is active immediately, others pending payment
      });

      // If MobilePay, send email to customer and optionally redirect
      if (formData.paymentMethod === 'mobilepay' && paymentLink) {
        try {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              to: customer.email,
              subject: `Subscription Payment Agreement for ${subscriptionProduct.name}`,
              content: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Setup Your Subscription</h2>
                  <p>Dear ${customer.name},</p>
                  <p>To activate your subscription for <strong>${subscriptionProduct.name}</strong>, please click the button below to approve the recurring payment agreement via MobilePay:</p>
                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${paymentLink}" 
                       style="background-color: #5a31f4; color: white; padding: 14px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                      Activate MobilePay Subscription
                    </a>
                  </div>
                  <p><strong>Amount:</strong> ${subscriptionProduct.price} DKK</p>
                  <p><strong>Frequency:</strong> Every ${subscriptionProduct.durationMonths} months</p>
                  <p>Best regards,<br>Jysk Streaming Team</p>
                </div>
              `,
            }),
          });
          alert('Subscription created! A MobilePay agreement link has been sent to the customer.');
        } catch (emailError) {
          console.error('Failed to send subscription email:', emailError);
          // Fallback: Show link to admin
          alert(`Subscription created, but email failed. Link: ${paymentLink}`);
        }
      } else if (formData.paymentMethod === 'revolut' && paymentLink) {
        alert(`Revolut payment link generated: ${paymentLink}. Please send this to the customer.`);
      } else if (formData.paymentMethod === 'manual') {
        alert('Subscription created and marked as active (manual payment).');
      }

      resetForm();
      actions.loadAllData(); // Reload all data to reflect changes
    } catch (error) {
      console.error('Error saving subscription or generating invoice:', error);
      alert('Failed to save subscription or generate invoice. Please try again.');
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const productData = {
        name: productFormData.name,
        description: productFormData.description,
        durationMonths: productFormData.durationMonths,
        price: productFormData.price,
        features: productFormData.features.filter(f => f.trim() !== ''),
        isActive: true
      };

      if (editingProduct) {
        await actions.updateSubscriptionProduct(editingProduct.id, productData);
      } else {
        await actions.createSubscriptionProduct(productData);
      }

      resetProductForm();
    } catch (error) {
      console.error('Error saving subscription product:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      subscriptionProductId: '',
      startDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'manual' as 'mobilepay' | 'revolut' | 'manual'
    });
    setShowForm(false);
    setEditingSubscription(null);
  };

  const resetProductForm = () => {
    setProductFormData({
      name: '',
      description: '',
      durationMonths: 1,
      price: 0,
      features: ['']
    });
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      customerId: subscription.customerId,
      subscriptionProductId: '', // This is not available on the subscription object anymore
      startDate: subscription.startDate.split('T')[0],
      paymentMethod: subscription.paymentMethod || 'manual', // Load existing payment method
    });
    setShowForm(true);
  };

  const handleEditProduct = (product: SubscriptionProduct) => {
    setEditingProduct(product);
    setProductFormData({
      name: product.name,
      description: product.description || '',
      durationMonths: product.durationMonths,
      price: product.price,
      features: product.features.length > 0 ? product.features : ['']
    });
    setShowProductForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this subscription?')) {
      try {
        await actions.deleteSubscription(id);
      } catch (error) {
        console.error('Error deleting subscription:', error);
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this subscription product?')) {
      try {
        await actions.deleteSubscriptionProduct(id);
        alert('Product deleted successfully!');
      } catch (error) {
        console.error('Error deleting subscription product:', error);
        alert('Error deleting product. Please try again.');
      }
    }
  };

  const handleCleanDuplicates = async () => {
    if (!confirm('This will identify and remove duplicate subscription products. Only the most recent product with the same name and duration will be kept. Continue?')) {
      return;
    }

    try {
      const products = state.subscriptionProducts || [];
      const duplicateGroups = products.reduce((acc, product) => {
        const key = `${product.name.toLowerCase()}-${product.durationMonths}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(product);
        return acc;
      }, {} as Record<string, typeof products>);

      const duplicates = Object.entries(duplicateGroups)
        .filter(([_, group]) => group.length > 1);

      if (duplicates.length === 0) {
        alert('No duplicate subscription products found!');
        return;
      }

      const duplicateNames = duplicates.map(([, group]) =>
        `${group[0].name} (${group[0].durationMonths} months): ${group.length} duplicates`
      ).join('\n');

      const confirmMessage = `Found ${duplicates.length} duplicate product groups:\n\n${duplicateNames}\n\nThis will remove all but the most recent product in each group. Continue?`;

      if (!confirm(confirmMessage)) {
        return;
      }

      // Remove duplicates, keeping the most recent one
      for (const [_, group] of duplicates) {
        const sortedGroup = group.sort((a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
        );

        const toKeep = sortedGroup[0];
        const toRemove = sortedGroup.slice(1);

        console.log(`Keeping: ${toKeep.name} (${toKeep.durationMonths} months) - ${toKeep.id}`);
        console.log(`Removing duplicates:`, toRemove.map(p => `${p.name} - ${p.id}`));

        for (const product of toRemove) {
          await actions.deleteSubscriptionProduct(product.id);
        }
      }

      alert(`Cleaned up ${duplicates.reduce((sum, [_, group]) => sum + (group.length - 1), 0)} duplicate products!`);
      actions.loadAllData(); // Reload data to reflect changes
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      alert('Error cleaning duplicates. Please try again.');
    }
  };

  const addFeature = () => {
    setProductFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setProductFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f)
    }));
  };

  const removeFeature = (index: number) => {
    setProductFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const activeSubscriptions = filteredSubscriptions.filter(s => s.status === 'active');
  const expiringSubscriptions = activeSubscriptions.filter(s => getDaysUntilExpiry(s.endDate) <= 10);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Subscription Management</h2>
          <p className="text-gray-600 mt-2">Manage customer subscriptions and renewal reminders</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleCleanDuplicates}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 shadow-sm"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clean Duplicates</span>
          </button>
          <button
            onClick={() => setShowProductForm(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 shadow-sm"
          >
            <Package className="h-4 w-4" />
            <span>Add Product</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Subscription</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeSubscriptions.length}</p>
              <p className="text-sm text-gray-600">Active Subscriptions</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{expiringSubscriptions.length}</p>
              <p className="text-sm text-gray-600">Expiring Soon</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <Clock className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(activeSubscriptions.reduce((total, sub) => total + sub.price, 0), 'DKK', null)}
              </p>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Subscription Products */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Subscription Products</h3>
            <span className="text-sm text-gray-600">
              {(() => {
                const products = state.subscriptionProducts?.filter(p => p.isActive) || [];
                const duplicateGroups = products.reduce((acc, product) => {
                  const key = `${product.name.toLowerCase()}-${product.durationMonths}`;
                  if (!acc[key]) acc[key] = 0;
                  acc[key]++;
                  return acc;
                }, {} as Record<string, number>);
                const duplicates = Object.values(duplicateGroups).filter(count => count > 1).reduce((sum, count) => sum + (count - 1), 0);
                return `${products.length} products${duplicates > 0 ? ` (${duplicates} duplicates)` : ''}`;
              })()}
            </span>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {state.subscriptionProducts?.filter(p => p.isActive).map((product) => {
              const products = state.subscriptionProducts?.filter(p => p.isActive) || [];
              const duplicates = products.filter(p =>
                p.name.toLowerCase() === product.name.toLowerCase() &&
                p.durationMonths === product.durationMonths &&
                p.id !== product.id
              );
              const isDuplicate = duplicates.length > 0;

              return (
                <div key={product.id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${isDuplicate ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                  }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{product.name}</h4>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="text-blue-600 hover:text-blue-700 p-1"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {isDuplicate && (
                    <div className="mb-2">
                      <span className="inline-flex px-2 py-1 text-xs font-medium text-orange-800 bg-orange-200 rounded-full">
                        ⚠️ Duplicate
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(product.price, 'DKK', null)}</span>
                    <span className="text-sm text-gray-500">{product.durationMonths} month{product.durationMonths > 1 ? 's' : ''}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {product.features?.slice(0, 2).map((feature, index) => (
                      <div key={index}>• {feature}</div>
                    ))}
                    {product.features?.length > 2 && <div>• +{product.features.length - 2} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add/Edit Subscription Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              {editingSubscription ? 'Edit Subscription' : 'Add New Subscription'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer *
                  </label>
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a customer</option>
                    {state.customers?.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription Product *
                  </label>
                  <select
                    required
                    value={formData.subscriptionProductId}
                    onChange={(e) => setFormData(prev => ({ ...prev, subscriptionProductId: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a product</option>
                    {state.subscriptionProducts?.filter(p => p.isActive).map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(product.price, 'DKK', null)} ({product.durationMonths} month{product.durationMonths > 1 ? 's' : ''})
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
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    required
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as 'mobilepay' | 'revolut' | 'manual' }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="mobilepay">MobilePay (Recurring)</option>
                    <option value="manual">Manual</option>
                    <option value="revolut">Revolut (Manual Invoice)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingSubscription ? 'Update' : 'Add'} Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Product Form */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              {editingProduct ? 'Edit Product' : 'Add New Subscription Product'}
            </h3>

            <form onSubmit={handleProductSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={productFormData.name}
                  onChange={(e) => setProductFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Premium Streaming - 1 Month"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={productFormData.description}
                  onChange={(e) => setProductFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Product description..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (Months) *
                  </label>
                  <select
                    value={productFormData.durationMonths}
                    onChange={(e) => setProductFormData(prev => ({ ...prev, durationMonths: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (DKK) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={productFormData.price}
                    onChange={(e) => setProductFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Features
                  </label>
                  <button
                    type="button"
                    onClick={addFeature}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Feature
                  </button>
                </div>

                {productFormData.features.map((feature, index) => (
                  <div key={index} className="flex space-x-3 mb-3">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => updateFeature(index, e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Feature description"
                    />
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="px-3 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingProduct ? 'Update' : 'Add'} Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscriptions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {filteredSubscriptions.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No subscriptions found</p>
            <p className="text-gray-400">Add your first subscription to get started</p>
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
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reminders
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubscriptions.map((subscription) => {
                  const customer = state.customers.find(c => c.id === subscription.customerId);
                  const customerName = customer ? customer.name : 'N/A';
                  const subscriptionProduct = state.subscriptionProducts?.find(p => p.id === subscription.productId);
                  const daysLeft = getDaysUntilExpiry(subscription.endDate);
                  const invoice = state.invoices?.find(inv => inv.id === subscription.invoiceId);
                  return (
                    <tr key={subscription.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{customerName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {subscriptionProduct ? subscriptionProduct.name : (subscription.productName || 'Unknown')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {subscriptionProduct ? `${subscriptionProduct.durationMonths} month${subscriptionProduct.durationMonths > 1 ? 's' : ''}` : (subscription.durationMonths ? `${subscription.durationMonths} month${subscription.durationMonths > 1 ? 's' : ''}` : 'N/A')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                        {formatCurrency(subscription.price, 'DKK', null)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        <div>
                          {new Date(subscription.endDate).toLocaleDateString()}
                          {daysLeft <= 7 && daysLeft > 0 && (
                            <div className="text-xs text-amber-600 font-medium">
                              {daysLeft} days left
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                            subscription.status === 'expired' ? 'bg-red-100 text-red-800' :
                              subscription.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                          }`}>
                          {subscription.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${subscription.paymentMethod === 'mobilepay' ? 'bg-blue-100 text-blue-800' :
                              subscription.paymentMethod === 'revolut' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {subscription.paymentMethod}
                          </span>
                          {invoice && (
                            <a href="#" onClick={() => alert(`Invoice ID: ${invoice.id}\nStatus: ${invoice.status}`)} className="text-blue-500 hover:underline">
                              <DollarSign className="h-4 w-4" />
                            </a>
                          )}
                          {invoice?.paymentLink && (
                            <a href={invoice.paymentLink} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-1">
                          <span
                            className={`inline-flex px-2 py-1 text-xs rounded ${subscription.reminder10Sent ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                              }`}
                            title={subscription.reminder10Sent ? '10-day reminder sent' : '10-day reminder not sent'}
                          >
                            10d
                          </span>
                          <span
                            className={`inline-flex px-2 py-1 text-xs rounded ${subscription.reminder5Sent ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                              }`}
                            title={subscription.reminder5Sent ? '5-day reminder sent' : '5-day reminder not sent'}
                          >
                            5d
                          </span>
                          {(() => {
                            const reminderStatus = getSubscriptionReminderStatus(subscription);
                            if (reminderStatus.needsReminder) {
                              return (
                                <span className={`inline-flex px-2 py-1 text-xs rounded font-medium ${reminderStatus.isUrgent
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {reminderStatus.isUrgent ? '!' : '?'}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(subscription)}
                            className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(subscription.id)}
                            className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
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
    </div>
  );
}
