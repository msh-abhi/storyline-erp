import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sale, DigitalCode, TVBox, SubscriptionProduct, Customer, Reseller } from '../types';

// ... (Assuming you have a formatCurrency utility function)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export default function SalesManagement() {
  const { state, actions } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const initialFormData = {
    productType: 'digital_code' as 'digital_code' | 'tv_box' | 'subscription',
    productId: '',
    buyerType: 'customer' as 'customer' | 'reseller',
    buyerId: '',
    quantity: 1,
    paymentStatus: 'received' as 'received' | 'due' | 'partial',
    status: 'completed' as 'completed' | 'pending' | 'cancelled',
  };
  const [formData, setFormData] = useState(initialFormData);

  const filteredSales = state.sales.filter((sale: Sale) =>
    (sale.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.buyerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAvailableProducts = (): (DigitalCode | TVBox | SubscriptionProduct)[] => {
    switch (formData.productType) {
      case 'digital_code':
        return state.digitalCodes.filter((code: DigitalCode) => code.quantity > (code.soldQuantity || 0));
      case 'tv_box':
        return state.tvBoxes.filter((box: TVBox) => box.quantity > (box.soldQuantity || 0));
      case 'subscription':
        return state.subscriptionProducts?.filter((product: SubscriptionProduct) => product.isActive) || [];
      default:
        return [];
    }
  };

  const availableProducts = getAvailableProducts();
  const availableBuyers = formData.buyerType === 'customer' ? state.customers : state.resellers;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingSale(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = availableProducts.find((p: DigitalCode | TVBox | SubscriptionProduct) => p.id === formData.productId);
    const buyer = availableBuyers.find((b: Customer | Reseller) => b.id === formData.buyerId);

    if (!product || !buyer) return alert('Please select a valid product and buyer.');

    let unitPrice = 0;
    let productName = '';
    let purchasePrice = 0;

    if (formData.productType === 'subscription') {
      const subProd = product as SubscriptionProduct;
      unitPrice = subProd.price;
      productName = subProd.name;
    } else {
      const stockProd = product as DigitalCode | TVBox;
      unitPrice = formData.buyerType === 'customer' ? stockProd.customerPrice : stockProd.resellerPrice;
      productName = 'name' in stockProd ? stockProd.name : stockProd.model;
      purchasePrice = stockProd.purchasePrice || 0;
    }

    const totalPrice = unitPrice * formData.quantity;
    const profit = (unitPrice - purchasePrice) * formData.quantity;

    const saleData: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'> = {
      productId: formData.productId,
      productName,
      productType: formData.productType,
      buyerId: formData.buyerId,
      buyerName: buyer.name,
      buyerType: formData.buyerType,
      customerId: formData.buyerType === 'customer' ? formData.buyerId : null,
      quantity: formData.quantity,
      unitPrice,
      totalPrice,
      profit,
      paymentStatus: formData.paymentStatus,
      status: formData.status,
      saleDate: new Date().toISOString(),
    };

    try {
      if (editingSale) {
        await actions.updateSale(editingSale.id, saleData);
      } else {
        const newSale = await actions.createSale(saleData);
        if (newSale && (formData.productType === 'digital_code' || formData.productType === 'tv_box')) {
          const stockProduct = product as DigitalCode | TVBox;
          const updatedStock = { soldQuantity: (stockProduct.soldQuantity || 0) + formData.quantity };
          if (formData.productType === 'digital_code') {
            await actions.updateDigitalCode(product.id, updatedStock);
          } else {
            await actions.updateTVBox(product.id, updatedStock);
          }
        }
        if (newSale && formData.productType === 'subscription') {
          const subProd = product as SubscriptionProduct;
          const startDate = new Date();
          const endDate = new Date();
          endDate.setMonth(startDate.getMonth() + subProd.durationMonths);
          await actions.createSubscription({
            customer_id: buyer.id,
            customerName: buyer.name,
            productId: subProd.id,
            productName: subProd.name,
            status: 'active',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            price: subProd.price,
            durationMonths: subProd.durationMonths,
            reminder7Sent: false,
            reminder3Sent: false,
          });
        }
      }
      resetForm();
    } catch (error) {
      console.error("Error saving sale:", error);
      // Optionally show a toast notification
    }
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setFormData({
      productType: sale.productType,
      productId: sale.productId,
      buyerType: sale.buyerType,
      buyerId: sale.buyerId,
      quantity: sale.quantity,
      paymentStatus: sale.paymentStatus,
      status: sale.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this sale?')) {
      try {
        await actions.deleteSale(id);
        // Optionally, update stock if the sale is deleted
        // This logic might need to be more complex depending on your business rules
      } catch (error) {
        console.error("Error deleting sale:", error);
      }
    }
  };

  const totalRevenue = filteredSales.reduce((total: number, sale: Sale) => total + sale.totalPrice, 0);
  const totalProfit = filteredSales.reduce((total: number, sale: Sale) => total + sale.profit, 0);
  const totalSales = filteredSales.length;
  const outstandingAmount = filteredSales
    .filter((sale: Sale) => sale.paymentStatus === 'due')
    .reduce((total: number, sale: Sale) => total + sale.totalPrice, 0);

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
            onChange={(e) => setSearchTerm(e.target.value)} // FIX: Using handleChange for searchTerm
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
                    name="productType" // FIX: Added name attribute
                    value={formData.productType}
                    onChange={handleChange} // FIX: Using handleChange
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
                    name="buyerType" // FIX: Added name attribute
                    value={formData.buyerType}
                    onChange={handleChange} // FIX: Using handleChange
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
                    name="productId" // FIX: Added name attribute
                    value={formData.productId}
                    onChange={handleChange} // FIX: Using handleChange
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a product</option>
                    {availableProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.id && formData.productType === 'subscription'
                          ? `${(product as SubscriptionProduct).name} - ${formatCurrency((product as SubscriptionProduct).price)}`
                          : product.id && formData.productType === 'digital_code'
                            ? `${(product as DigitalCode).name} (Stock: ${(product as DigitalCode).quantity - (product as DigitalCode).soldQuantity})` // FIX: Conditional access
                            : product.id && formData.productType === 'tv_box'
                              ? `${(product as TVBox).model} (Stock: ${(product as TVBox).quantity - (product as TVBox).soldQuantity})` // FIX: Conditional access
                              : 'Invalid Product'
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
                    name="buyerId" // FIX: Added name attribute
                    value={formData.buyerId}
                    onChange={handleChange} // FIX: Using handleChange
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
                    name="quantity" // FIX: Added name attribute
                    value={formData.quantity}
                    onChange={handleChange} // FIX: Using handleChange
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Status *
                  </label>
                  <select
                    name="paymentStatus" // FIX: Added name attribute
                    value={formData.paymentStatus}
                    onChange={handleChange} // FIX: Using handleChange
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
                    name="status" // FIX: Added name attribute
                    value={formData.status}
                    onChange={handleChange} // FIX: Using handleChange
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
                        <div className="text-sm text-gray-500 capitalize">{sale.productType?.replace('_', ' ') || 'N/A'}</div>
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
                      {formatCurrency(sale.totalPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${sale.profit > 0 ? 'text-green-600' : sale.profit < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(sale.profit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        sale.paymentStatus === 'received' ? 'bg-green-100 text-green-800' :
                        sale.paymentStatus === 'due' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sale.paymentStatus}
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