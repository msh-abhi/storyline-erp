import React, { useState } from 'react';
import { ShoppingCart, Package, DollarSign, TrendingUp, Search, Filter, Plus, Eye, Edit2, Trash2, Calendar, User, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useApp } from '../../../context/AppContext';
import { Sale } from '../../../types';
import { formatCurrency, calculateTotalRevenue, calculateInventoryProfit } from '../../../utils/calculations';

const UnifiedSalesModule: React.FC = () => {
  const { state, actions } = useApp();
  
  const formatCurrencyWithState = (amount: number) => {
    return formatCurrency(
      amount, 
      state.settings?.currency || 'DKK', 
      state.exchangeRates, 
      state.settings?.displayCurrency
    );
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  // Filter sales based on search and status
  const filteredSales = state.sales.filter(sale => {
    const matchesSearch = sale.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.buyerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (statusFilter === 'all') return true;
    return sale.status === statusFilter;
  });

  // Calculate metrics (use all sales for stats, not filtered)
  const totalRevenue = calculateTotalRevenue(state.sales);
  const totalProfit = calculateInventoryProfit(state.sales);
  const totalSales = state.sales.length;
  const completedSales = state.sales.filter(s => s.status === 'completed').length;
  const pendingSales = state.sales.filter(s => s.status === 'pending').length;

  const handleAddSale = () => {
    setEditingSale(null);
    setShowAddModal(true);
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setShowAddModal(true);
  };

  const handleMarkAsComplete = async (id: string) => {
    try {
      await actions.updateSale(id, {
        status: 'completed',
        paymentStatus: 'received'
      });
      toast.success('Sale marked as completed successfully!');
    } catch (error) {
      console.error("Error marking sale as complete:", error);
      toast.error(`Error updating sale: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this sale?')) {
      try {
        // Find the sale to reverse inventory changes
        const saleToDelete = state.sales.find(sale => sale.id === id);
        if (!saleToDelete) {
          console.error("Sale not found for deletion");
          return;
        }

        // Reverse inventory changes for physical products
        if (saleToDelete.productType === 'digital_code' || saleToDelete.productType === 'tv_box') {
          const currentStock = saleToDelete.productType === 'digital_code'
            ? state.digitalCodes.find(code => code.id === saleToDelete.productId)
            : state.tvBoxes.find(box => box.id === saleToDelete.productId);

          if (currentStock) {
            const updatedSoldQuantity = Math.max(0, (currentStock.soldQuantity || 0) - saleToDelete.quantity);

            if (saleToDelete.productType === 'digital_code') {
              await actions.updateDigitalCode(saleToDelete.productId, { soldQuantity: updatedSoldQuantity });
            } else {
              await actions.updateTVBox(saleToDelete.productId, { soldQuantity: updatedSoldQuantity });
            }
          }
        }

        // Delete the sale
        await actions.deleteSale(id);

        toast.success('Sale deleted successfully. Inventory has been updated.');
      } catch (error) {
        console.error("Error deleting sale:", error);
        toast.error(`Error deleting sale: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBuyerTypeIcon = (buyerType: string) => {
    switch (buyerType) {
      case 'customer': return <User className="h-4 w-4 text-blue-600" />;
      case 'reseller': return <Package className="h-4 w-4 text-purple-600" />;
      default: return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ShoppingCart className="mr-3 text-orange-600" />
            Sales Management
          </h1>
          <p className="text-gray-600 mt-1">
            Track and manage all sales transactions, revenue, and customer orders
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
            onClick={handleAddSale}
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Record Sale
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrencyWithState(totalRevenue)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <span className="text-green-600 font-medium">+8.2%</span>
              <span className="text-gray-500 ml-2">from last month</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Profit</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrencyWithState(totalProfit)}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <span className="text-blue-600 font-medium">{((totalProfit / totalRevenue) * 100).toFixed(1)}%</span>
              <span className="text-gray-500 ml-2">profit margin</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-3xl font-bold text-gray-900">{totalSales}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <span className="text-purple-600 font-medium">{completedSales} completed</span>
              <span className="text-gray-500 ml-2">• {pendingSales} pending</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Sale</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrencyWithState(totalSales > 0 ? totalRevenue / totalSales : 0)}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg">
              <Calendar className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <span className="text-indigo-600 font-medium">per transaction</span>
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
                placeholder="Search sales..."
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

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sales found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'No results match your search criteria.' : 'Get started by recording your first sale.'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleAddSale}
                className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Plus size={16} className="mr-2" />
                Record Sale
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
                    Buyer
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
                    Profit
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
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{sale.productName}</div>
                        <div className="text-sm text-gray-500 capitalize">{sale.productType?.replace('_', ' ')}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getBuyerTypeIcon(sale.buyerType)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{sale.buyerName}</div>
                          <div className="text-sm text-gray-500 capitalize">{sale.buyerType}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrencyWithState(sale.unitPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrencyWithState(sale.totalPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrencyWithState(sale.profit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sale.status || 'unknown')}`}>
                        {sale.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sale.saleDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {sale.status === 'pending' && (
                          <button
                            onClick={() => handleMarkAsComplete(sale.id)}
                            className="text-green-600 hover:text-green-700 p-1 rounded"
                            title="Mark as Complete"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => {/* Handle view details */}}
                          className="text-blue-600 hover:text-blue-700 p-1 rounded"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEditSale(sale)}
                          className="text-gray-600 hover:text-gray-700 p-1 rounded"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteSale(sale.id)}
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

      {/* Add/Edit Sale Modal would go here */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingSale ? 'Edit Sale' : 'Record New Sale'}
            </h3>
            {/* Form fields would go here */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                {editingSale ? 'Update Sale' : 'Record Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedSalesModule;
