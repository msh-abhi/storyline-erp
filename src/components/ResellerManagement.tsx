import React, { useState } from 'react';
import { Plus, Edit2, Trash2, DollarSign, Search, CreditCard, TrendingUp, Mail, Eye } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Reseller } from '../types';
import { formatCurrency } from '../utils/calculations';
import DataTable from './common/DataTable';

export default function ResellerManagement() {
  const { state, actions } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    commissionRate: 0,
    totalSales: 0,
    outstandingPayment: 0
  });
  const [creditFormData, setCreditFormData] = useState({
    amount: 0,
    saleAmount: 0,
    paymentMethod: 'bank_transfer'
  });
  const [emailFormData, setEmailFormData] = useState({
    subject: '',
    content: ''
  });

  const formatCurrencyWrapper = (amount: number) => formatCurrency(amount, state.settings?.currency || 'DKK', state.exchangeRates, state.settings?.displayCurrency);

  const filteredResellers = state.resellers.filter(reseller =>
    reseller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reseller.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const resellerData = {
        name: formData.name,
        email: formData.email,
        commissionRate: formData.commissionRate,
        totalSales: formData.totalSales,
        outstandingPayment: formData.outstandingPayment,
        outstandingBalance: formData.outstandingPayment, // Map outstandingPayment to outstandingBalance
        creditBalance: 0
      };

      if (editingReseller) {
        await actions.updateReseller(editingReseller.id, resellerData);
      } else {
        await actions.createReseller(resellerData);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving reseller:', error);
    }
  };

  const handleCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReseller) return;

    try {
      await actions.addResellerCredit(
        selectedReseller.id,
        creditFormData.amount,
        creditFormData.paymentMethod
      );
      
      resetCreditForm();
    } catch (error) {
      console.error('Error adding credit:', error);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReseller) return;

    try {
      await actions.sendEmail(
        selectedReseller.email,
        emailFormData.subject,
        emailFormData.content,
        { name: selectedReseller.name, email: selectedReseller.email }
      );
      
      alert('Email sent successfully!');
      resetEmailForm();
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', commissionRate: 0, totalSales: 0, outstandingPayment: 0 });
    setShowForm(false);
    setEditingReseller(null);
  };

  const resetCreditForm = () => {
    setCreditFormData({ amount: 0, saleAmount: 0, paymentMethod: 'bank_transfer' });
    setShowCreditForm(false);
    setSelectedReseller(null);
  };

  const resetEmailForm = () => {
    setEmailFormData({ subject: '', content: '' });
    setShowEmailForm(false);
    setSelectedReseller(null);
  };

  const handleEdit = (reseller: Reseller) => {
    setEditingReseller(reseller);
    setFormData({
      name: reseller.name,
      email: reseller.email,
      commissionRate: reseller.commissionRate,
      totalSales: reseller.totalSales,
      outstandingPayment: reseller.outstandingPayment
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this reseller?')) {
      try {
        await actions.deleteReseller(id);
      } catch (error) {
        console.error('Error deleting reseller:', error);
      }
    }
  };

  const handleAddCredit = (reseller: Reseller) => {
    setSelectedReseller(reseller);
    setShowCreditForm(true);
  };

  const handleViewDetails = (reseller: Reseller) => {
    setSelectedReseller(reseller);
    setShowDetailModal(true);
  };

  const handleSendEmail = (reseller: Reseller) => {
    setSelectedReseller(reseller);
    setEmailFormData({
      subject: `Message from ${state.settings?.companyName || 'Jysk Streaming'}`,
      content: `Dear ${reseller.name},\n\n\n\nBest regards,\n${state.settings?.companyName || 'Jysk Streaming'} Team`
    });
    setShowEmailForm(true);
  };

  const getResellerSales = (resellerId: string) => {
    return state.sales.filter(sale => sale.buyerId === resellerId && sale.buyerType === 'reseller');
  };

  const totalCreditBalance = filteredResellers.reduce((total, reseller) => 
    total + (reseller.creditBalance || 0), 0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Reseller Management</h2>
          <p className="text-gray-600 mt-2">Track sales performance, manage payments, and credit balances</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Reseller</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrencyWrapper(filteredResellers.reduce((total, r) => total + r.totalSales, 0))}
              </p>
              <p className="text-sm text-gray-600">Total Sales</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrencyWrapper(filteredResellers.reduce((total, r) => total + r.outstandingPayment, 0))}
              </p>
              <p className="text-sm text-gray-600">Outstanding Payments</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <CreditCard className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrencyWrapper(totalCreditBalance)}</p>
              <p className="text-sm text-gray-600">Total Credit Balance</p>
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
            placeholder="Search resellers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingReseller ? 'Edit Reseller' : 'Add New Reseller'}
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
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Sales (DKK)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.totalSales}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalSales: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Outstanding Payment (DKK)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.outstandingPayment}
                  onChange={(e) => setFormData(prev => ({ ...prev, outstandingPayment: parseFloat(e.target.value) || 0 }))}
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
                  {editingReseller ? 'Update' : 'Add'} Reseller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Credit Form */}
      {showCreditForm && selectedReseller && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Credit for {selectedReseller.name}
            </h3>
            
            <form onSubmit={handleCreditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credit Amount (DKK) *
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
                  Sale Amount (DKK) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={creditFormData.saleAmount}
                  onChange={(e) => setCreditFormData(prev => ({ ...prev, saleAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Amount you received for this credit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={creditFormData.paymentMethod}
                  onChange={(e) => setCreditFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="mobile_pay">Mobile Pay</option>
                  <option value="paypal">PayPal</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {creditFormData.saleAmount > 0 && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-700">
                    <strong>Profit:</strong> {formatCurrencyWrapper(creditFormData.saleAmount)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    This amount will be added to your profit since credit costs nothing to provide.
                  </p>
                </div>
              )}

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

      {/* Email Form */}
      {showEmailForm && selectedReseller && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Send Email to {selectedReseller.name}
            </h3>
            
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={emailFormData.subject}
                  onChange={(e) => setEmailFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  required
                  rows={8}
                  value={emailFormData.content}
                  onChange={(e) => setEmailFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetEmailForm}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Mail className="h-4 w-4" />
                  <span>Send Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedReseller && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedReseller.name} - Details
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                <p className="text-sm text-gray-600">Email: {selectedReseller.email}</p>
                <p className="text-sm text-gray-600">Commission Rate: {selectedReseller.commissionRate}%</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Financial Summary</h4>
                <p className="text-sm text-gray-600">Total Sales: {formatCurrencyWrapper(selectedReseller.totalSales)}</p>
                <p className="text-sm text-gray-600">Outstanding: {formatCurrencyWrapper(selectedReseller.outstandingPayment)}</p>
                <p className="text-sm text-gray-600">Credit Balance: {formatCurrencyWrapper(selectedReseller.creditBalance || 0)}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-4">Purchase History</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-left">Quantity</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                      <th className="px-4 py-2 text-left">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getResellerSales(selectedReseller.id).map((sale) => (
                      <tr key={sale.id}>
                        <td className="px-4 py-2">{new Date(sale.saleDate).toLocaleDateString()}</td>
                        <td className="px-4 py-2">{sale.productName}</td>
                        <td className="px-4 py-2">{sale.quantity}</td>
                        <td className="px-4 py-2">{formatCurrencyWrapper(sale.totalAmount)}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            (sale as any).paymentStatus === 'received' ? 'bg-green-100 text-green-800' :
                            (sale as any).paymentStatus === 'due' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {(sale as any).paymentStatus || 'received'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reseller List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredResellers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No resellers found. Add your first reseller to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reseller
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Sales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outstanding
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredResellers.map((reseller) => (
                  <tr key={reseller.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewDetails(reseller)}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {reseller.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {reseller.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                      {formatCurrencyWrapper(reseller.totalSales)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${reseller.outstandingPayment > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                        {formatCurrencyWrapper(reseller.outstandingPayment)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-green-600">
                        {formatCurrencyWrapper(reseller.creditBalance || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {reseller.commissionRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(reseller)}
                          className="text-gray-600 hover:text-gray-700 p-1"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSendEmail(reseller)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="Send Email"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleAddCredit(reseller)}
                          className="text-green-600 hover:text-green-700 p-1"
                          title="Add Credit"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(reseller)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(reseller.id)}
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