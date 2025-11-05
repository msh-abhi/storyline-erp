import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Package, DollarSign, TrendingUp, AlertTriangle, User, Filter, ShoppingCart } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Purchase, DigitalCode, TVBox } from '../../../types';
import { formatCurrency, calculateTotalExpenses } from '../../../utils/calculations';

interface PurchaseFormData {
  productType: 'digital_code' | 'tv_box';
  productId: string;
  supplierId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: 'completed' | 'pending' | 'cancelled';
  description?: string;
  receiptUrl?: string;
}

const EnhancedUnifiedPurchaseModule: React.FC = () => {
  const { state, actions } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(false);

  const formatCurrencyWithState = (amount: number) => {
    return formatCurrency(
      amount, 
      state.settings?.currency || 'DKK', 
      state.exchangeRates, 
      state.settings?.displayCurrency
    );
  };

  const initialFormData: PurchaseFormData = {
    productType: 'digital_code',
    productId: '',
    supplierId: '',
    quantity: 1,
    unitPrice: 0,
    totalAmount: 0,
    status: 'completed',
    description: '',
    receiptUrl: ''
  };

  const [formData, setFormData] = useState<PurchaseFormData>(initialFormData);

  // Filter purchases based on search and status
  const filteredPurchases = state.purchases.filter(purchase => {
    const matchesSearch = purchase.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (purchase.description && purchase.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    if (statusFilter === 'all') return true;
    return purchase.status === statusFilter;
  });

  // Calculate metrics
  const totalExpenses = calculateTotalExpenses(filteredPurchases);
  const totalPurchases = filteredPurchases.length;
  const completedPurchases = filteredPurchases.filter(p => p.status === 'completed').length;
  const pendingPurchases = filteredPurchases.filter(p => p.status === 'pending').length;
  const cancelledPurchases = filteredPurchases.filter(p => p.status === 'cancelled').length;

  const getAvailableProducts = (): (DigitalCode | TVBox)[] => {
    switch (formData.productType) {
      case 'digital_code':
        return state.digitalCodes;
      case 'tv_box':
        return state.tvBoxes;
      default:
        return [];
    }
  };

  const availableProducts = getAvailableProducts();
  const availableSuppliers = state.suppliers;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const product = availableProducts.find(p => p.id === formData.productId);
      const supplier = availableSuppliers.find(s => s.id === formData.supplierId);

      if (!product || !supplier) {
        alert('Please select a valid product and supplier.');
        return;
      }

      // Validate form data
      if (formData.quantity <= 0) {
        alert('Quantity must be greater than 0.');
        return;
      }

      if (formData.unitPrice <= 0) {
        alert('Unit price must be greater than 0.');
        return;
      }

      const totalAmount = formData.unitPrice * formData.quantity;

      const purchaseData: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'> = {
        productId: formData.productId,
        productName: 'name' in product ? product.name : product.model,
        productType: formData.productType,
        supplierId: formData.supplierId,
        supplierName: supplier.name,
        quantity: formData.quantity,
        unitPrice: formData.unitPrice,
        totalAmount,
        purchaseDate: new Date().toISOString(),
        status: formData.status,
        description: formData.description,
        receiptUrl: formData.receiptUrl,
      };

      // Create the purchase
      const newPurchase = await actions.createPurchase(purchaseData);
      if (!newPurchase) throw new Error('Failed to create purchase.');

      // Update inventory for the purchased product
      const updatedQuantity = (product.quantity || 0) + formData.quantity;
      const updatedPurchasePrice = formData.unitPrice; // Update to latest purchase price
      
      if (formData.productType === 'digital_code') {
        await actions.updateDigitalCode(product.id, { 
          quantity: updatedQuantity,
          purchasePrice: updatedPurchasePrice,
          purchaseSource: supplier.name 
        });
      } else {
        await actions.updateTVBox(product.id, { 
          quantity: updatedQuantity,
          purchasePrice: updatedPurchasePrice,
          purchaseSource: supplier.name 
        });
      }

      // Send email notification to supplier (non-blocking)
      try {
        const productName = 'name' in product ? product.name : product.model;
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            to: supplier.email,
            subject: `Purchase Order Confirmation`,
            content: `Dear ${supplier.name},<br><br>This is to confirm our purchase order:<br><br>Product: ${productName}<br>Quantity: ${formData.quantity}<br>Unit Price: ${formatCurrencyWithState(formData.unitPrice)}<br>Total: ${formatCurrencyWithState(totalAmount)}<br><br>Purchase ID: ${newPurchase.id}<br><br>Best regards,<br>Jysk Streaming Team`,
          }),
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail for email errors
      }

      alert('Purchase recorded successfully!');
      resetForm();

    } catch (error) {
      console.error("Error saving purchase:", error);
      alert(`Error saving purchase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingPurchase(null);
    setShowForm(false);
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setFormData({
      productType: purchase.productType,
      productId: purchase.productId,
      supplierId: purchase.supplierId,
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      totalAmount: purchase.totalAmount,
      status: purchase.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this purchase? This will also decrease the inventory quantity.')) {
      try {
        // Get the purchase to reverse the inventory
        const purchase = state.purchases.find(p => p.id === id);
        if (purchase) {
          // Find the product and decrease quantity
          const product = formData.productType === 'digital_code' 
            ? state.digitalCodes.find(p => p.id === purchase.productId)
            : state.tvBoxes.find(p => p.id === purchase.productId);
          
          if (product) {
            const updatedQuantity = Math.max(0, (product.quantity || 0) - purchase.quantity);
            
            if (formData.productType === 'digital_code') {
              await actions.updateDigitalCode(product.id, { quantity: updatedQuantity });
            } else {
              await actions.updateTVBox(product.id, { quantity: updatedQuantity });
            }
          }
        }
        
        await actions.deletePurchase(id);
      } catch (error) {
        console.error("Error deleting purchase:", error);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-calculate total amount when quantity or unit price changes
      if (name === 'quantity' || name === 'unitPrice') {
        updated.totalAmount = (parseFloat(updated.quantity.toString()) || 0) * (parseFloat(updated.unitPrice.toString()) || 0);
      }
      
      return updated;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ShoppingCart className="mr-3 text-blue-600" />
            Purchase Management
          </h1>
          <p className="text-gray-600 mt-1">
            Centralized expense management with real-time inventory updates and comprehensive cost tracking
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Export Report
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Record Purchase
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrencyWithState(totalExpenses)}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <DollarSign className="h-4 w-4 text-red-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center text-xs">
              <span className="text-red-600 font-medium">All time</span>
              <span className="text-gray-500 ml-1">spending</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Purchases</p>
              <p className="text-2xl font-bold text-gray-900">{totalPurchases}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center text-xs">
              <span className="text-blue-600 font-medium">{completedPurchases} done</span>
              <span className="text-gray-500 ml-1">• {pendingPurchases} pending</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Average Purchase</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrencyWithState(totalPurchases > 0 ? totalExpenses / totalPurchases : 0)}
              </p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center text-xs">
              <span className="text-green-600 font-medium">per transaction</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-gray-900">{pendingPurchases}</p>
            </div>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center text-xs">
              <span className="text-yellow-600 font-medium">awaiting delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search purchases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <Filter size={16} className="mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredPurchases.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No purchases found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'No results match your search criteria.' : 'Get started by recording your first purchase.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} className="mr-2" />
                Record Purchase
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{purchase.productName}</div>
                        <div className="text-sm text-gray-500 capitalize">{purchase.productType?.replace('_', ' ')}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-600 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{purchase.supplierName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {purchase.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrencyWithState(purchase.unitPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrencyWithState(purchase.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(purchase.status || 'unknown')}`}>
                        {purchase.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(purchase.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(purchase)}
                          className="text-gray-600 hover:text-gray-700 p-1 rounded"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(purchase.id)}
                          className="text-red-600 hover:text-red-700 p-1 rounded"
                          title="Delete"
                        >
                          <Trash2 size={16} />
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

      {/* Add/Edit Purchase Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingPurchase ? 'Edit Purchase' : 'Record New Purchase'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Type *
                  </label>
                  <select
                    name="productType"
                    value={formData.productType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="digital_code">Digital Code</option>
                    <option value="tv_box">TV Box</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier *
                  </label>
                  <select
                    name="supplierId"
                    value={formData.supplierId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a supplier</option>
                    {availableSuppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product *
                  </label>
                  <select
                    name="productId"
                    value={formData.productId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a product</option>
                    {availableProducts.map((product) => {
                      const productDisplayName = 'name' in product ? product.name : product.model;
                      return (
                        <option key={product.id} value={product.id}>
                          {productDisplayName} (Current Stock: {product.quantity || 0})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit Price *
                  </label>
                  <input
                    type="number"
                    name="unitPrice"
                    min="0"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Amount
                  </label>
                  <input
                    type="number"
                    name="totalAmount"
                    value={formData.totalAmount}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes about this purchase..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receipt/Invoice URL
                </label>
                <input
                  type="url"
                  name="receiptUrl"
                  value={formData.receiptUrl}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              {/* Inventory Impact Warning */}
              {formData.productId && (
                <InventoryImpactWarning 
                  productId={formData.productId}
                  quantity={formData.quantity}
                  productType={formData.productType}
                  availableProducts={availableProducts}
                />
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Processing...' : (editingPurchase ? 'Update Purchase' : 'Record Purchase')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Inventory Impact Warning Component
const InventoryImpactWarning: React.FC<{
  productId: string;
  quantity: number;
  productType: string;
  availableProducts: (DigitalCode | TVBox)[];
}> = ({ productId, quantity, productType, availableProducts }) => {
  const product = availableProducts.find(p => p.id === productId) as DigitalCode | TVBox;
  if (!product) return null;

  const currentStock = product.quantity || 0;
  const newStock = currentStock + quantity;
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center">
        <Package className="h-5 w-5 text-blue-600 mr-2" />
        <div>
          <h4 className="text-sm font-medium text-blue-800">Inventory Impact</h4>
          <p className="text-sm text-blue-700">
            Current stock: {currentStock} → New stock after purchase: {newStock}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            This purchase will automatically update the product's stock level and purchase price.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnhancedUnifiedPurchaseModule;