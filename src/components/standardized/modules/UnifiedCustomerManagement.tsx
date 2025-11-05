import React, { useState } from 'react';
import { Users, Store, UserPlus, Search, Filter, Download, Eye, Edit2, Trash2, Mail, Phone, MapPin, Calendar, CreditCard, X } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Customer, Reseller, Sale, Invoice, Subscription } from '../../../types';
import { formatCurrency } from '../../../utils/calculations';

interface UnifiedCustomerManagementProps {
  activeView: 'customers' | 'resellers';
}

const UnifiedCustomerManagement: React.FC<UnifiedCustomerManagementProps> = ({ activeView }) => {
  const { state, actions } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Customer | Reseller | null>(null);
  const [viewingEntity, setViewingEntity] = useState<Customer | Reseller | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Get current data based on view
  const data: (Customer | Reseller)[] = activeView === 'customers' ? state.customers : state.resellers;
  
  // Action placeholders for future modal implementations
  // const createAction = activeView === 'customers' ? actions.createCustomer : actions.createReseller;
  // const updateAction = activeView === 'customers' ? actions.updateCustomer : actions.updateReseller;
  const deleteAction = activeView === 'customers' ? actions.deleteCustomer : actions.deleteReseller;

  // Filter and search logic
  const filteredData = data.filter((entity: Customer | Reseller) => {
    const matchesSearch = entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entity.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'active') return true; // Add status field if needed
    if (selectedFilter === 'inactive') return false; // Add status field if needed
    
    return true;
  });

  // Calculate summary statistics
  const totalCount = data.length;
  const activeCount = data.length; // Placeholder - add status tracking
  const totalRevenue = data.reduce((sum: number, entity: Customer | Reseller) => {
    if (activeView === 'customers') {
      const customer = entity as Customer;
      // Calculate revenue from sales for this customer (filtered from state.sales)
      const customerSales = state.sales.filter(sale => sale.customerId === customer.id);
      return sum + customerSales.reduce((saleSum, sale) => saleSum + (sale.totalPrice || 0), 0);
    } else {
      const reseller = entity as Reseller;
      return sum + (reseller.outstandingBalance || 0);
    }
  }, 0);

  const handleAdd = () => {
    setEditingEntity(null);
    setShowAddModal(true);
  };

  const handleEdit = (entity: Customer | Reseller) => {
    setEditingEntity(entity);
    setShowAddModal(true);
  };

  const handleViewDetails = (entity: Customer | Reseller) => {
    setViewingEntity(entity);
    setShowDetailModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this entity?')) {
      try {
        await deleteAction(id);
      } catch (error) {
        console.error('Error deleting entity:', error);
      }
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrencyWithState = (amount: number) => {
    return formatCurrency(
      amount,
      state.settings?.currency || 'DKK',
      state.exchangeRates,
      state.settings?.displayCurrency
    );
  };

  // Get customer details for view modal
  const getCustomerDetails = (customer: Customer) => {
    const customerSales = state.sales.filter(sale => sale.customerId === customer.id);
    const customerInvoices = state.invoices.filter(invoice => invoice.customerId === customer.id);
    const customerSubscriptions = state.subscriptions?.filter(sub => sub.customerId === customer.id) || [];
    
    const totalSpent = customerSales.reduce((sum, sale) => sum + (sale.totalPrice || 0), 0);
    const totalPaidInvoices = customerInvoices.filter(inv => inv.status === 'paid');
    const activeSubscriptions = customerSubscriptions.filter(sub => sub.status === 'active');

    return {
      totalSpent,
      totalSales: customerSales.length,
      totalInvoices: customerInvoices.length,
      paidInvoices: totalPaidInvoices.length,
      totalSubscriptions: customerSubscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      recentSales: customerSales.slice(0, 5),
      recentInvoices: customerInvoices.slice(0, 5),
      subscriptions: customerSubscriptions
    };
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            {activeView === 'customers' ? <Users className="mr-3 text-blue-600" /> : <Store className="mr-3 text-emerald-600" />}
            {activeView === 'customers' ? 'Customer Management' : 'Reseller Management'}
          </h1>
          <p className="text-gray-600 mt-1">
            {activeView === 'customers' 
              ? 'Manage customer relationships and data' 
              : 'Manage reseller network and partnerships'
            }
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Download size={16} className="mr-2" />
            Export
          </button>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus size={16} className="mr-2" />
            Add {activeView === 'customers' ? 'Customer' : 'Reseller'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total {activeView === 'customers' ? 'Customers' : 'Resellers'}</p>
              <p className="text-3xl font-bold text-gray-900">{totalCount}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              {activeView === 'customers' ? 
                <Users className="h-6 w-6 text-blue-600" /> : 
                <Store className="h-6 w-6 text-emerald-600" />
              }
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <span className="text-green-600 font-medium">{activeCount} Active</span>
              <span className="text-gray-500 ml-2">•</span>
              <span className="text-gray-500 ml-2">{totalCount - activeCount} Inactive</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {activeView === 'customers' ? 'Total Customer Value' : 'Outstanding Balance'}
              </p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrencyWithState(totalRevenue)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <span className="text-green-600 font-medium">+12.5%</span>
              <span className="text-gray-500 ml-2">from last month</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average {activeView === 'customers' ? 'Spending' : 'Commission'}</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrencyWithState(totalCount > 0 ? totalRevenue / totalCount : 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Mail className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <span className="text-purple-600 font-medium">+5.2%</span>
              <span className="text-gray-500 ml-2">from last month</span>
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
                placeholder={`Search ${activeView}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              {activeView === 'customers' ? 
                <Users className="h-8 w-8 text-gray-400" /> : 
                <Store className="h-8 w-8 text-gray-400" />
              }
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No {activeView} found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'No results match your search criteria.' : `Get started by adding your first ${activeView === 'customers' ? 'customer' : 'reseller'}.`}
            </p>
            {!searchTerm && (
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus size={16} className="mr-2" />
                Add {activeView === 'customers' ? 'Customer' : 'Reseller'}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeView === 'customers' ? 'Customer' : 'Reseller'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Information
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeView === 'customers' ? 'Total Spent' : 'Balance'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((entity: Customer | Reseller) => (
                  <tr key={entity.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors" onClick={() => handleViewDetails(entity)}>
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors">
                            <span className="text-sm font-medium text-blue-600">
                              {entity.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                            {entity.name}
                          </div>
                          <div className="text-sm text-gray-500">ID: {entity.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{entity.email}</div>
                      {entity.phone && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <Phone size={12} className="mr-1" />
                          {entity.phone}
                        </div>
                      )}
                      {entity.address && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <MapPin size={12} className="mr-1" />
                          {entity.address}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {activeView === 'customers' ?
                        (() => {
                          const customer = entity as Customer;
                          const customerSales = state.sales.filter(sale => sale.customerId === customer.id);
                          const totalSpent = customerSales.reduce((sum, sale) => sum + (sale.totalPrice || 0), 0);
                          return formatCurrencyWithState(totalSpent);
                        })() :
                        formatCurrencyWithState((entity as Reseller).outstandingBalance || 0)
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(entity.updatedAt || entity.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(entity)}
                          className="text-blue-600 hover:text-blue-700 p-1 rounded"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(entity)}
                          className="text-gray-600 hover:text-gray-700 p-1 rounded"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(entity.id)}
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

      {/* Add/Edit Modal would go here */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingEntity ? `Edit ${activeView === 'customers' ? 'Customer' : 'Reseller'}` : `Add New ${activeView === 'customers' ? 'Customer' : 'Reseller'}`}
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingEntity ? 'Update' : 'Add'} {activeView === 'customers' ? 'Customer' : 'Reseller'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer/Reseller Detail Modal */}
      {showDetailModal && viewingEntity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {activeView === 'customers' ? 'Customer' : 'Reseller'} Details
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Basic Info */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xl font-semibold text-blue-600">
                        {viewingEntity.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-semibold text-gray-900">{viewingEntity.name}</h4>
                      <p className="text-gray-600">{viewingEntity.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {viewingEntity.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone size={16} className="mr-2" />
                        {viewingEntity.phone}
                      </div>
                    )}
                    {viewingEntity.address && (
                      <div className="flex items-start text-sm text-gray-600">
                        <MapPin size={16} className="mr-2 mt-0.5" />
                        {viewingEntity.address}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar size={16} className="mr-2" />
                      Joined: {formatDate(viewingEntity.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="lg:col-span-2">
                {activeView === 'customers' ? (
                  <CustomerStats customer={viewingEntity as Customer} />
                ) : (
                  <ResellerStats reseller={viewingEntity as Reseller} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Customer Statistics Component
const CustomerStats: React.FC<{ customer: Customer }> = ({ customer }) => {
  const { state } = useApp();
  const details = (() => {
    const customerSales = state.sales.filter(sale => sale.customerId === customer.id);
    const customerInvoices = state.invoices.filter(invoice => invoice.customerId === customer.id);
    const customerSubscriptions = state.subscriptions?.filter(sub => sub.customerId === customer.id) || [];
    
    const totalSpent = customerSales.reduce((sum, sale) => sum + (sale.totalPrice || 0), 0);
    const totalPaidInvoices = customerInvoices.filter(inv => inv.status === 'paid');
    const activeSubscriptions = customerSubscriptions.filter(sub => sub.status === 'active');

    return {
      totalSpent,
      totalSales: customerSales.length,
      totalInvoices: customerInvoices.length,
      paidInvoices: totalPaidInvoices.length,
      totalSubscriptions: customerSubscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      recentSales: customerSales.slice(0, 5),
      recentInvoices: customerInvoices.slice(0, 5),
      subscriptions: customerSubscriptions
    };
  })();

  const formatCurrencyWithState = (amount: number) => {
    return formatCurrency(
      amount,
      state.settings?.currency || 'DKK',
      state.exchangeRates,
      state.settings?.displayCurrency
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-blue-600">Total Spent</p>
          <p className="text-lg font-bold text-blue-900">{formatCurrencyWithState(details.totalSpent)}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-green-600">Total Sales</p>
          <p className="text-lg font-bold text-green-900">{details.totalSales}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-purple-600">Active Subscriptions</p>
          <p className="text-lg font-bold text-purple-900">{details.activeSubscriptions}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-orange-600">Paid Invoices</p>
          <p className="text-lg font-bold text-orange-900">{details.paidInvoices}/{details.totalInvoices}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h5 className="font-semibold text-gray-900 mb-3">Recent Sales</h5>
          <div className="space-y-2">
            {details.recentSales.map((sale) => (
              <div key={sale.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{sale.productName}</p>
                  <p className="text-xs text-gray-500">{new Date(sale.saleDate || '').toLocaleDateString()}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrencyWithState(sale.totalPrice || 0)}
                </span>
              </div>
            ))}
            {details.recentSales.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No sales found</p>
            )}
          </div>
        </div>

        <div>
          <h5 className="font-semibold text-gray-900 mb-3">Active Subscriptions</h5>
          <div className="space-y-2">
            {details.subscriptions.filter(sub => sub.status === 'active').map((subscription) => (
              <div key={subscription.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{subscription.productName}</p>
                  <p className="text-xs text-gray-500">
                    Expires: {new Date(subscription.endDate).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  {formatCurrencyWithState(subscription.price)}
                </span>
              </div>
            ))}
            {details.subscriptions.filter(sub => sub.status === 'active').length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No active subscriptions</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Reseller Statistics Component
const ResellerStats: React.FC<{ reseller: Reseller }> = ({ reseller }) => {
  const { state } = useApp();
  const formatCurrencyWithState = (amount: number) => {
    return formatCurrency(
      amount,
      state.settings?.currency || 'DKK',
      state.exchangeRates,
      state.settings?.displayCurrency
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-blue-600">Outstanding Balance</p>
          <p className="text-lg font-bold text-blue-900">
            {formatCurrencyWithState(reseller.outstandingBalance || 0)}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-green-600">Total Sales</p>
          <p className="text-lg font-bold text-green-900">
            {state.sales.filter(sale => sale.buyerId === reseller.id).length}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-purple-600">Status</p>
          <p className="text-lg font-bold text-purple-900">Active</p>
        </div>
      </div>

      {/* Reseller Details */}
      <div>
        <h5 className="font-semibold text-gray-900 mb-3">Reseller Information</h5>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Contact:</strong> {reseller.email}
          </p>
          {reseller.phone && (
            <p className="text-sm text-gray-600 mb-2">
              <strong>Phone:</strong> {reseller.phone}
            </p>
          )}
          {reseller.address && (
            <p className="text-sm text-gray-600 mb-2">
              <strong>Address:</strong> {reseller.address}
            </p>
          )}
          <p className="text-sm text-gray-600">
            <strong>Joined:</strong> {new Date(reseller.createdAt || '').toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnifiedCustomerManagement;