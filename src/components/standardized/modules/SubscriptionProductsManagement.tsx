import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Package, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../components/AuthProvider';
import { SubscriptionProduct } from '../../../types';
import { formatCurrency } from '../../../utils/calculations';

const SubscriptionProductsManagement: React.FC = () => {
  const { state, actions } = useApp();
  const { authUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SubscriptionProduct | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationMonths: 1,
    price: 0,
    features: ['']
  });

  // Filter products by search term
  const filteredProducts = state.subscriptionProducts?.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Find duplicate products
  const products = state.subscriptionProducts?.filter(p => p.isActive) || [];
  const duplicateGroups = products.reduce((acc, product) => {
    const key = `${product.name.toLowerCase()}-${product.durationMonths}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(product);
    return acc;
  }, {} as Record<string, typeof products>);

  const duplicates = Object.entries(duplicateGroups)
    .filter(([_, group]) => group.length > 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        durationMonths: formData.durationMonths,
        price: formData.price,
        features: formData.features.filter(f => f.trim() !== ''),
        isActive: true
      };

      if (editingProduct) {
        await actions.updateSubscriptionProduct(editingProduct.id, productData);
      } else {
        await actions.createSubscriptionProduct(productData);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving subscription product:', error);
      alert('Failed to save product. Please try again.');
    }
  };

  const handleEdit = (product: SubscriptionProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      durationMonths: product.durationMonths,
      price: product.price,
      features: product.features.length > 0 ? product.features : ['']
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await actions.deleteSubscriptionProduct(id);
        alert('Product deleted successfully!');
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product. Please try again.');
      }
    }
  };

  const handleCleanDuplicates = async () => {
    if (!confirm('This will identify and remove duplicate subscription products. Only the most recent product with the same name and duration will be kept. Continue?')) {
      return;
    }

    try {
      const duplicateCount = duplicates.reduce((sum, [_, group]) => sum + (group.length - 1), 0);

      if (duplicates.length === 0) {
        alert('No duplicate subscription products found!');
        return;
      }

      const duplicateNames = duplicates.map(([, group]) =>
        `${group[0].name} (${group[0].durationMonths} months): ${group.length} duplicates`
      ).join('\n');

      const confirmMessage = `Found ${duplicates.length} duplicate product groups:\n\n${duplicateNames}\n\nThis will remove ${duplicateCount} duplicate products, keeping only the most recent one in each group. Continue?`;
      
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

        for (const product of toRemove) {
          await actions.deleteSubscriptionProduct(product.id);
        }
      }

      alert(`Cleaned up ${duplicateCount} duplicate products!`);
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      alert('Error cleaning duplicates. Please try again.');
    }
  };

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f)
    }));
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      durationMonths: 1,
      price: 0,
      features: ['']
    });
    setShowForm(false);
    setEditingProduct(null);
  };

  const formatCurrencyWithState = (amount: number) => {
    const currency = state.settings?.displayCurrency || 'DKK';
    return formatCurrency(amount, currency, null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Products</h1>
            <p className="text-gray-600">Manage subscription product catalog and features</p>
          </div>
          <div className="flex space-x-3">
            {duplicates.length > 0 && (
              <button
                onClick={handleCleanDuplicates}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 shadow-sm"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Clean Duplicates ({duplicates.reduce((sum, [_, group]) => sum + (group.length - 1), 0)})</span>
              </button>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-200 rounded-full">
                <Package className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">{products.length}</p>
                <p className="text-sm text-green-700">Active Products</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-200 rounded-full">
                <DollarSign className="h-6 w-6 text-purple-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrencyWithState(products.reduce((total, p) => total + p.price, 0) / products.length || 0)}
                </p>
                <p className="text-sm text-purple-700">Average Price</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-200 rounded-full">
                <Clock className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">
                  {Math.round(products.reduce((total, p) => total + p.durationMonths, 0) / products.length || 0)}
                </p>
                <p className="text-sm text-blue-700">Avg Duration (months)</p>
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
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Product Catalog</h2>
        </div>
        
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No subscription products found</p>
            <p className="text-gray-400">Add your first product to get started</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const productDuplicates = products.filter(p =>
                  p.name.toLowerCase() === product.name.toLowerCase() &&
                  p.durationMonths === product.durationMonths &&
                  p.id !== product.id
                );
                const isDuplicate = productDuplicates.length > 0;
                
                return (
                  <div key={product.id} className={`border rounded-lg p-6 hover:shadow-md transition-all duration-200 ${
                    isDuplicate ? 'border-orange-300 bg-orange-50' : 'border-gray-200 hover:border-blue-300'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{product.name}</h3>
                      <div className="flex space-x-2 ml-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-100 rounded transition-colors"
                          title="Edit product"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-700 p-1 hover:bg-red-100 rounded transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {isDuplicate && (
                      <div className="mb-4">
                        <span className="inline-flex px-3 py-1 text-xs font-medium text-orange-800 bg-orange-200 rounded-full">
                          ⚠️ Duplicate ({productDuplicates.length + 1} found)
                        </span>
                      </div>
                    )}

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description || 'No description available'}</p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold text-green-600">
                          {formatCurrencyWithState(product.price)}
                        </span>
                        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {product.durationMonths} month{product.durationMonths > 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {product.features && product.features.length > 0 && (
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Features:</p>
                          <div className="space-y-1">
                            {product.features.slice(0, 3).map((feature, index) => (
                              <div key={index} className="flex items-center text-xs text-gray-600">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 flex-shrink-0"></div>
                                <span className="truncate">{feature}</span>
                              </div>
                            ))}
                            {product.features.length > 3 && (
                              <div className="text-xs text-gray-400">
                                +{product.features.length - 3} more features
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Created: {new Date(product.createdAt!).toLocaleDateString('en-DK')}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              {editingProduct ? 'Edit Subscription Product' : 'Add New Subscription Product'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Premium Streaming - 1 Month"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Product description..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (Months) *
                  </label>
                  <select
                    value={formData.durationMonths}
                    onChange={(e) => setFormData(prev => ({ ...prev, durationMonths: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    + Add Feature
                  </button>
                </div>
                
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex space-x-3 mb-3">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => updateFeature(index, e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  onClick={resetForm}
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
    </div>
  );
};

export default SubscriptionProductsManagement;