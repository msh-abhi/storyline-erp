import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Package, DollarSign, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TVBox } from '../types';
import { generateId, formatCurrency } from '../utils/calculations';

export default function InventoryManagement() {
  const { state, dispatch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingTVBox, setEditingTVBox] = useState<TVBox | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    model: '',
    purchasePrice: 0,
    sellingPrice: 0,
    purchaseSource: '',
    quantity: 1,
    soldQuantity: 0,
    soldTo: '',
    soldDate: ''
  });

  const filteredTVBoxes = state.tvBoxes.filter(tvbox =>
    tvbox.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tvbox.purchaseSource.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const profit = (formData.sellingPrice - formData.purchasePrice) * formData.soldQuantity;
    
    const tvBoxData: TVBox = {
      id: editingTVBox?.id || generateId(),
      model: formData.model,
      purchasePrice: formData.purchasePrice,
      sellingPrice: formData.sellingPrice || undefined,
      purchaseSource: formData.purchaseSource,
      quantity: formData.quantity,
      soldQuantity: formData.soldQuantity,
      profit: profit,
      createdAt: editingTVBox?.createdAt || new Date().toISOString(),
      soldTo: formData.soldTo || undefined,
      soldDate: formData.soldDate || undefined
    };

    if (editingTVBox) {
      dispatch({ type: 'UPDATE_TVBOX', payload: tvBoxData });
    } else {
      dispatch({ type: 'ADD_TVBOX', payload: tvBoxData });
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      model: '',
      purchasePrice: 0,
      sellingPrice: 0,
      purchaseSource: '',
      quantity: 1,
      soldQuantity: 0,
      soldTo: '',
      soldDate: ''
    });
    setShowForm(false);
    setEditingTVBox(null);
  };

  const handleEdit = (tvBox: TVBox) => {
    setEditingTVBox(tvBox);
    setFormData({
      model: tvBox.model,
      purchasePrice: tvBox.purchasePrice,
      sellingPrice: tvBox.sellingPrice || 0,
      purchaseSource: tvBox.purchaseSource,
      quantity: tvBox.quantity,
      soldQuantity: tvBox.soldQuantity,
      soldTo: tvBox.soldTo || '',
      soldDate: tvBox.soldDate || ''
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this TV box from inventory?')) {
      dispatch({ type: 'DELETE_TVBOX', payload: id });
    }
  };

  const totalInventoryValue = filteredTVBoxes.reduce((total, box) => {
    const remainingQuantity = box.quantity - box.soldQuantity;
    return total + (remainingQuantity * box.purchasePrice);
  }, 0);

  const totalProfit = filteredTVBoxes.reduce((total, box) => total + box.profit, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">TV Box Inventory</h2>
          <p className="text-gray-600 mt-2">Manage inventory and track sales performance</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add TV Box</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <Package className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{filteredTVBoxes.length}</p>
              <p className="text-sm text-gray-600">Total Items</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalInventoryValue)}</p>
              <p className="text-sm text-gray-600">Inventory Value</p>
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
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search TV boxes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingTVBox ? 'Edit TV Box' : 'Add New TV Box'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model *
                </label>
                <input
                  type="text"
                  required
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Price ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, sellingPrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Source *
                </label>
                <input
                  type="text"
                  required
                  value={formData.purchaseSource}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchaseSource: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

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
                  Sold Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  max={formData.quantity}
                  value={formData.soldQuantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, soldQuantity: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {formData.soldQuantity > 0 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sold To
                    </label>
                    <input
                      type="text"
                      value={formData.soldTo}
                      onChange={(e) => setFormData(prev => ({ ...prev, soldTo: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sale Date
                    </label>
                    <input
                      type="date"
                      value={formData.soldDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, soldDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

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
                  {editingTVBox ? 'Update' : 'Add'} TV Box
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TV Box List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredTVBoxes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No TV boxes found. Add your first item to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Selling Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTVBoxes.map((tvBox) => (
                  <tr key={tvBox.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{tvBox.model}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {formatCurrency(tvBox.purchasePrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {tvBox.sellingPrice ? formatCurrency(tvBox.sellingPrice) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {tvBox.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {tvBox.soldQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${tvBox.profit > 0 ? 'text-green-600' : tvBox.profit < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(tvBox.profit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {tvBox.purchaseSource}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(tvBox)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tvBox.id)}
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