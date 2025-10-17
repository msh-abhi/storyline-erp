import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sale } from '../types';
import { formatCurrency } from '../utils/calculations';

export default function SalesManagement() {
  const { state, actions } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    productType: 'digital_code' as 'digital_code' | 'tv_box' | 'subscription',
    productId: '',
    buyerType: 'customer' as 'customer' | 'reseller',
    buyerId: '',
    quantity: 1,
    paymentStatus: 'received' as 'received' | 'due' | 'partial',
    status: 'completed' as 'completed' | 'pending' | 'cancelled'
  });

  const filteredSales = state.sales.filter(sale => {
    // Add defensive checks for undefined/null properties
    const productName = sale.productName || '';
    const buyerName = sale.buyerName || '';
    return productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           buyerName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getAvailableProducts = () => {
    switch (formData.productType) {
      case 'digital_code':
        return state.digitalCodes.filter(code => code.quantity > code.soldQuantity);
      case 'tv_box':
        return state.tvBoxes.filter(box => box.quantity > box.soldQuantity);
      case 'subscription':
        return state.subscriptionProducts?.filter(product => product.isActive) || [];
      default:
        return [];
    }
  };

  const availableProducts = getAvailableProducts();
  const availableBuyers = formData.buyerType === 'customer' ? state.customers : state.resellers;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const product = availableProducts.find(p => p.id === formData.productId);
    const buyer = availableBuyers.find(b => b.id === formData.buyerId);
    
    if (!product || !buyer) {
      alert('Please select valid product and buyer');
      return;
    }

    let unitPrice = 0;
    let productName = '';

    if (formData.productType === 'subscription') {
      unitPrice = (product as any).price;
      productName = (product as any).name;
    } else {
      unitPrice = formData.buyerType === 'customer' 
        ? (product as any).customerPrice 
        : (product as any).resellerPrice;
      productName = formData.productType === 'digital_code' 
        ? (product as any).name 
        : (product as any).model;
    }

    const totalAmount = unitPrice * formData.quantity;
    const purchasePrice = (product as any).purchasePrice || 0;
    const profit = (unitPrice - purchasePrice) * formData.quantity;

    const saleData = {
      productId: formData.productId,
      productType: formData.productType,
      productName: productName,
      buyerType: formData.buyerType,
      buyerId: formData.buyerId,
      buyerName: buyer.name,
      quantity: formData.quantity,
      unitPrice: unitPrice,
      totalAmount: totalAmount,
      profit: profit,
      paymentStatus: formData.paymentStatus,
      status: formData.status
    };

    try {
      if (editingSale) {
        await actions.updateSale(editingSale.id, saleData);
      } else {
        await actions.createSale(saleData);
        
        // Update product sold quantity for non-subscription products
        if (formData.productType !== 'subscription') {
          if (formData.productType === 'digital_code') {
            const updatedProduct = {
              ...product,
              soldQuantity: (product as any).soldQuantity + formData.quantity
            };
            await actions.updateDigitalCode(product.id, updatedProduct);
          } else if (formData.productType === 'tv_box') {
            const updatedProduct = {
              ...product,
              soldQuantity: (product as any).soldQuantity + formData.quantity
            };
            await actions.updateTVBox(product.id, updatedProduct);
          }
        }

        // If it's a subscription sale, create the subscription
        if (formData.productType === 'subscription') {
          const customer = state.customers.find(c => c.id === formData.buyerId);
          if (customer) {
            const subscriptionProduct = product as any;
            const startDate = new Date().toISOString();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + subscriptionProduct.durationMonths);

            await actions.createSubscription({
              customerId: customer.id,
              customerName: customer.name,
              productId: subscriptionProduct.id,
              productName: subscriptionProduct.name,
              startDate: startDate,
              endDate: endDate.toISOString(),
              durationMonths: subscriptionProduct.durationMonths,
              price: subscriptionProduct.price,
              status: 'active',
              reminder7Sent: false,
              reminder3Sent: false
            });
          }
        }
      }

      resetForm();
    } catch (error) {
      console.error('Error saving sale:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      productType: 'digital_code',
      productId: '',
      buyerType: 'customer',
      buyerId: '',
      quantity: 1,
      paymentStatus: 'received',
      status: 'completed'
    });
    setShowForm(false);
    setEditingSale(null);
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setFormData({
      productType: sale.productType,
      productId: sale.productId,
      buyerType: sale.buyerType,
      buyerId: sale.buyerId,
      quantity: sale.quantity,
      paymentStatus: (sale as any).paymentStatus || 'received',
      status: sale.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this sale?')) {
      try {
        await actions.deleteSale(id);
      } catch (error) {
        console.error('Error deleting sale:', error);
      }
    }
  };

  const totalRevenue = filteredSales.reduce((total, sale) => total + sale.totalAmount, 0);
  const totalProfit = filteredSales.reduce((total, sale) => total + sale.profit, 0);
  const totalSales = filteredSales.length;
  const outstandingAmount = filteredSales
    .filter(sale => (sale as any).paymentStatus === 'due')
    .reduce((total, sale) => total + sale.totalAmount, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Sales Management</h2>
          <p className="text-gray-600 mt-2">Record and track all sales transactions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Record Sale</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalSales}</p>
              <p className="text-sm text-gray-600">Total Sales</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
              <p className="text-sm text-gray-600">Total Revenue</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalProfit)}</p>
              <p className="text-sm text-gray-600">Total Profit</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(outstandingAmount)}</p>
              <p className="text-sm text-gray-600">Outstanding</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search sales..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingSale ? 'Edit Sale' : 'Record New Sale'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Type *
                  </label>
                  <select
                    value={formData.productType}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      productType: e.target.value as 'digital_code' | 'tv_box' | 'subscription',
                      productId: '' 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="digital_code">Digital Code</option>
                    <option value="tv_box">TV Box</option>
                    <option value="subscription">Subscription</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buyer Type *
                  </label>
                  <select
                    value={formData.buyerType}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      buyerType: e.target.value as 'customer' | 'reseller',
                      buyerId: '' 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="customer">Customer</option>
                    <option value="reseller">Reseller</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product *
                  </label>
                  <select
                    required
                    value={formData.productId}
                    onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a product</option>
                    {availableProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {formData.productType === 'subscription' 
                          ? `${(product as any).name} - ${formatCurrency((product as any).price)}`
                          : formData.productType === 'digital_code' 
                            ? `${(product as any).name} (Stock: ${product.quantity - product.soldQuantity})`
                            : `${(product as any).model} (Stock: ${product.quantity - product.soldQuantity})`
                        }
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buyer *
                  </label>
                  <select
                    required
                    value={formData.buyerId}
                    onChange={(e) => setFormData(prev => ({ ...prev, buyerId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a buyer</option>
                    {availableBuyers.map((buyer) => (
                      <option key={buyer.id} value={buyer.id}>
                        {buyer.name} ({buyer.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Status *
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentStatus: e.target.value as 'received' | 'due' | 'partial' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="received">Payment Received</option>
                    <option value="due">Payment Due</option>
                    <option value="partial">Partial Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'completed' | 'pending' | 'cancelled' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingSale ? 'Update' : 'Record'} Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sales List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredSales.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No sales recorded yet. Record your first sale to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buyer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{sale.productName}</div>
                        <div className="text-sm text-gray-500 capitalize">{sale.productType.replace('_', ' ')}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{sale.buyerName}</div>
                        <div className="text-sm text-gray-500 capitalize">{sale.buyerType}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {sale.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {formatCurrency(sale.unitPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${sale.profit > 0 ? 'text-green-600' : sale.profit < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(sale.profit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (sale as any).paymentStatus === 'received' ? 'bg-green-100 text-green-800' :
                        (sale as any).paymentStatus === 'due' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {(sale as any).paymentStatus || 'received'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                        sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(sale)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sale.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}