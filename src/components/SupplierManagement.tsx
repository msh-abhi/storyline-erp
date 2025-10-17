import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, DollarSign, CreditCard, TrendingUp, History } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Supplier } from '../types';
import { formatCurrency } from '../utils/calculations';

export default function SupplierManagement() {
  const { state, actions } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [showCreditSaleForm, setShowCreditSaleForm] = useState(false);
  const [showAdjustCreditForm, setShowAdjustCreditForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    totalPurchases: 0,
    amountOwed: 0
  });
  const [creditFormData, setCreditFormData] = useState({
    amount: 0,
    description: ''
  });
  const [creditSaleFormData, setCreditSaleFormData] = useState({
    resellerId: '',
    creditAmount: 0,
    salePrice: 0
  });
  const [adjustCreditFormData, setAdjustCreditFormData] = useState({
    amount: 0,
    description: ''
  });

  const filteredSuppliers = state.suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const supplierData = {
        name: formData.name,
        email: formData.email,
        totalPurchases: formData.totalPurchases,
        amountOwed: formData.amountOwed,
        creditBalance: 0,
        totalCreditEarned: 0
      };

      if (editingSupplier) {
        await actions.updateSupplier(editingSupplier.id, supplierData);
      } else {
        await actions.createSupplier(supplierData);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving supplier:', error);
    }
  };

  const handleCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSupplier) return;

    try {
      await actions.addSupplierCredit(
        selectedSupplier.id,
        creditFormData.amount,
        creditFormData.description
      );
      
      resetCreditForm();
    } catch (error) {
      console.error('Error adding credit:', error);
    }
  };

  const handleCreditSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSupplier) return;

    try {
      await actions.sellCreditToReseller(
        selectedSupplier.id,
        creditSaleFormData.resellerId,
        creditSaleFormData.creditAmount,
        creditSaleFormData.salePrice
      );
      
      resetCreditSaleForm();
    } catch (error) {
      console.error('Error selling credit:', error);
    }
  };

  const handleAdjustCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSupplier) return;

    try {
      await actions.adjustSupplierCredit(
        selectedSupplier.id,
        adjustCreditFormData.amount,
        adjustCreditFormData.description
      );
      
      resetAdjustCreditForm();
    } catch (error) {
      console.error('Error adjusting credit:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', totalPurchases: 0, amountOwed: 0 });
    setShowForm(false);
    setEditingSupplier(null);
  };

  const resetCreditForm = () => {
    setCreditFormData({ amount: 0, description: '' });
    setShowCreditForm(false);
    setSelectedSupplier(null);
  };

  const resetCreditSaleForm = () => {
    setCreditSaleFormData({ resellerId: '', creditAmount: 0, salePrice: 0 });
    setShowCreditSaleForm(false);
    setSelectedSupplier(null);
  };

  const resetAdjustCreditForm = () => {
    setAdjustCreditFormData({ amount: 0, description: '' });
    setShowAdjustCreditForm(false);
    setSelectedSupplier(null);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email,
      totalPurchases: supplier.totalPurchases,
      amountOwed: supplier.amountOwed
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      try {
        await actions.deleteSupplier(id);
      } catch (error) {
        console.error('Error deleting supplier:', error);
      }
    }
  };

  const handleAddCredit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowCreditForm(true);
  };

  const handleSellCredit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowCreditSaleForm(true);
  };

  const handleAdjustCredit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowAdjustCreditForm(true);
  };

  const totalCreditBalance = filteredSuppliers.reduce((total, supplier) => 
    total + (supplier.creditBalance || 0), 0
  );

  const totalCreditEarned = filteredSuppliers.reduce((total, supplier) => 
    total + (supplier.totalCreditEarned || 0), 0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Supplier Management</h2>
          <p className="text-gray-600 mt-2">Track purchases, manage supplier relationships, and handle credits</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Credit Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <CreditCard className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCreditBalance)}</p>
              <p className="text-sm text-gray-600">Total Credit Balance</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCreditEarned)}</p>
              <p className="text-sm text-gray-600">Total Credit Earned</p>
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
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Add/Edit Supplier Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Purchases ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.totalPurchases}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalPurchases: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Owed ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amountOwed}
                  onChange={(e) => setFormData(prev => ({ ...prev, amountOwed: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
                  {editingSupplier ? 'Update' : 'Add'} Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Credit Form */}
      {showCreditForm && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Credit for {selectedSupplier.name}
            </h3>
            
            <form onSubmit={handleCreditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credit Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={creditFormData.amount}
                  onChange={(e) => setCreditFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={creditFormData.description}
                  onChange={(e) => setCreditFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Monthly bonus credit"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetCreditForm}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Credit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sell Credit Form */}
      {showCreditSaleForm && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Sell Credit from {selectedSupplier.name}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Available Credit: {formatCurrency(selectedSupplier.creditBalance || 0)}
            </p>
            
            <form onSubmit={handleCreditSaleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reseller *
                </label>
                <select
                  required
                  value={creditSaleFormData.resellerId}
                  onChange={(e) => setCreditSaleFormData(prev => ({ ...prev, resellerId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a reseller</option>
                  {state.resellers.map((reseller) => (
                    <option key={reseller.id} value={reseller.id}>
                      {reseller.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credit Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedSupplier.creditBalance || 0}
                  required
                  value={creditSaleFormData.creditAmount}
                  onChange={(e) => setCreditSaleFormData(prev => ({ ...prev, creditAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sale Price ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={creditSaleFormData.salePrice}
                  onChange={(e) => setCreditSaleFormData(prev => ({ ...prev, salePrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {creditSaleFormData.creditAmount > 0 && creditSaleFormData.salePrice > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Profit: <span className="font-semibold text-green-600">
                      {formatCurrency(creditSaleFormData.salePrice - creditSaleFormData.creditAmount)}
                    </span>
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetCreditSaleForm}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Sell Credit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Credit Form */}
      {showAdjustCreditForm && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Adjust Credit for {selectedSupplier.name}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Current Balance: {formatCurrency(selectedSupplier.creditBalance || 0)}
            </p>
            
            <form onSubmit={handleAdjustCreditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adjustment Amount (DKK) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={adjustCreditFormData.amount}
                  onChange={(e) => setAdjustCreditFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter positive or negative amount"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use positive numbers to add credit, negative to subtract
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Adjustment *
                </label>
                <input
                  type="text"
                  required
                  value={adjustCreditFormData.description}
                  onChange={(e) => setAdjustCreditFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Correction for data entry error"
                />
              </div>

              {adjustCreditFormData.amount !== 0 && (
                <div className={`p-3 rounded-lg ${adjustCreditFormData.amount > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`text-sm ${adjustCreditFormData.amount > 0 ? 'text-green-700' : 'text-red-700'}`}>
                    <strong>New Balance:</strong> {formatCurrency((selectedSupplier.creditBalance || 0) + adjustCreditFormData.amount)}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetAdjustCreditForm}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Adjust Credit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredSuppliers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No suppliers found. Add your first supplier to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Purchases
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount Owed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{supplier.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {supplier.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                      {formatCurrency(supplier.totalPurchases)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${supplier.amountOwed > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(supplier.amountOwed)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-green-600">
                        {formatCurrency(supplier.creditBalance || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(supplier.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleAdjustCredit(supplier)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="Adjust Credit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleAddCredit(supplier)}
                          className="text-green-600 hover:text-green-700 p-1"
                          title="Add Credit"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSellCredit(supplier)}
                          className="text-purple-600 hover:text-purple-700 p-1"
                          title="Sell Credit"
                          disabled={!supplier.creditBalance || supplier.creditBalance <= 0}
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="text-gray-600 hover:text-gray-700 p-1"
                          title="Edit Supplier"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id)}
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