import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ShoppingCart, DollarSign, TrendingUp, AlertTriangle, Package, Calendar, User } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Sale, DigitalCode, TVBox, SubscriptionProduct } from '../../../types';
import { formatCurrency, calculateTotalRevenue, calculateInventoryProfit, calculateOutstandingAmount } from '../../../utils/calculations';
import { generateInvoice } from '../../../utils/invoiceGenerator';
import DataTable from '../../common/DataTable';
import SearchableSelect from '../../common/SearchableSelect';


interface SaleFormData {
  productType: 'digital_code' | 'tv_box' | 'subscription';
  productId: string;
  buyerType: 'customer' | 'reseller';
  buyerId: string;
  quantity: number;
  paymentMethod: 'mobilepay' | 'revolut' | 'manual' | 'cash' | 'paypal';
  status: 'completed' | 'pending' | 'cancelled';
}

const EnhancedUnifiedSalesModule: React.FC = () => {
  const { state, actions } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);

  const formatCurrencyWithState = (amount: number) => {
    return formatCurrency(
      amount, 
      state.settings?.currency || 'DKK', 
      state.exchangeRates, 
      state.settings?.displayCurrency
    );
  };

  const initialFormData: SaleFormData = {
    productType: 'digital_code',
    productId: '',
    buyerType: 'customer',
    buyerId: '',
    quantity: 1,
    paymentMethod: 'mobilepay',
    status: 'completed'
  };

  const [formData, setFormData] = useState<SaleFormData>(initialFormData);

  // Filter sales based on status
  const filteredSales = state.sales.filter(sale => {
    if (statusFilter === 'all') return true;
    return sale.status === statusFilter;
  });

  // Sort sales by creation date (newest first)
  const sortedSales = filteredSales.sort((a, b) => {
    const dateA = new Date(a.createdAt || a.updatedAt || a.saleDate);
    const dateB = new Date(b.createdAt || b.updatedAt || b.saleDate);
    return dateB.getTime() - dateA.getTime();
  });

  // Calculate metrics
  const totalRevenue = calculateTotalRevenue(sortedSales);
  const totalProfit = calculateInventoryProfit(sortedSales);
  const totalSales = sortedSales.length;
  const completedSales = sortedSales.filter(s => s.status === 'completed').length;
  const pendingSales = sortedSales.filter(s => s.status === 'pending').length;
  const outstandingAmount = calculateOutstandingAmount(sortedSales);

  const getAvailableProducts = (): (DigitalCode | TVBox | SubscriptionProduct)[] => {
    switch (formData.productType) {
      case 'digital_code':
        return state.digitalCodes.filter(code => 
          code.quantity > 0 && code.quantity > (code.soldQuantity || 0)
        );
      case 'tv_box':
        return state.tvBoxes.filter(box => 
          box.quantity > 0 && box.quantity > (box.soldQuantity || 0)
        );
      case 'subscription':
        return state.subscriptionProducts?.filter(product => product.isActive) || [];
      default:
        return [];
    }
  };

  const availableProducts = getAvailableProducts();
  const availableBuyers = formData.buyerType === 'customer' ? state.customers : state.resellers;

  // Convert products to option format for SearchableSelect
  const productOptions = availableProducts.map(product => {
    const stockInfo = formData.productType !== 'subscription'
      ? ` (Stock: ${(product as any).quantity - (product as any).soldQuantity})`
      : '';
    
    let productDisplayName = '';
    if ('name' in product) {
      productDisplayName = product.name;
    } else if ('model' in product) {
      productDisplayName = product.model;
    } else {
      productDisplayName = 'Unknown Product';
    }

    return {
      id: product.id,
      label: `${productDisplayName}${stockInfo}`,
      description: `Type: ${formData.productType.replace('_', ' ')}`
    };
  });

  // Convert buyers to option format for SearchableSelect
  const buyerOptions = availableBuyers.map(buyer => ({
    id: buyer.id,
    label: buyer.name,
    email: buyer.email,
    description: `${formData.buyerType || 'contact'}`
  }));

  const validateInventory = (product: DigitalCode | TVBox | SubscriptionProduct): { valid: boolean; message?: string } => {
    if (formData.productType === 'subscription') {
      return { valid: true };
    }

    const stockProduct = product as DigitalCode | TVBox;
    const availableStock = stockProduct.quantity - (stockProduct.soldQuantity || 0);
    
    if (availableStock < formData.quantity) {
      return {
        valid: false,
        message: `Insufficient stock. Available: ${availableStock}, Requested: ${formData.quantity}`
      };
    }
    
    if (availableStock <= 0) {
      return { valid: false, message: 'Product is out of stock' };
    }

    return { valid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const product = availableProducts.find(p => p.id === formData.productId);
      const buyer = availableBuyers.find(b => b.id === formData.buyerId);

      if (!product || !buyer) {
        alert('Please select a valid product and buyer.');
        return;
      }

      // Validate inventory
      const inventoryCheck = validateInventory(product);
      if (!inventoryCheck.valid) {
        alert(inventoryCheck.message);
        return;
      }

      let unitPrice = 0;
      let productName = '';
      let purchasePrice = 0;

      if (formData.productType === 'subscription') {
        const subProd = product as SubscriptionProduct;
        unitPrice = subProd.price;
        productName = subProd.name;
        purchasePrice = 0; // No direct cost for subscriptions
      } else {
        const stockProd = product as DigitalCode | TVBox;
        unitPrice = formData.buyerType === 'customer' ? (stockProd.customerPrice || 0) : (stockProd.resellerPrice || 0);
        productName = 'name' in stockProd ? stockProd.name : stockProd.model;
        purchasePrice = stockProd.purchasePrice || 0;
      }

      // Validate that we have a valid unit price
      if (!unitPrice || unitPrice <= 0) {
        alert('Selected product does not have a valid price. Please check product pricing.');
        return;
      }

      const totalPrice = unitPrice * formData.quantity;
      const profit = (unitPrice - purchasePrice) * formData.quantity;

      const isOfflinePayment = ['manual', 'cash', 'paypal'].includes(formData.paymentMethod);

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
        totalAmount: totalPrice,
        profit,
        paymentMethod: formData.paymentMethod,
        status: isOfflinePayment ? formData.status : 'pending',
        paymentStatus: isOfflinePayment ? 'received' : 'due',
        saleDate: new Date().toISOString(),
      };

      // Create the sale
      const newSale = await actions.createSale(saleData);
      if (!newSale) throw new Error('Failed to create sale.');

      // Update inventory for physical products
      if (formData.productType === 'digital_code' || formData.productType === 'tv_box') {
        const stockProduct = product as DigitalCode | TVBox;
        const updatedSoldQuantity = (stockProduct.soldQuantity || 0) + formData.quantity;
        
        if (formData.productType === 'digital_code') {
          await actions.updateDigitalCode(product.id, { soldQuantity: updatedSoldQuantity });
        } else {
          await actions.updateTVBox(product.id, { soldQuantity: updatedSoldQuantity });
        }
      }

      // Generate invoice for payment
      let invoiceResult;
      try {
        invoiceResult = await generateInvoice({
          customerId: buyer.id,
          customerName: buyer.name,
          customerEmail: buyer.email,
          amount: totalPrice,
          currency: state.settings?.currency || 'DKK',
          dueDate: new Date().toISOString(),
          paymentMethod: formData.paymentMethod,
          metadata: {
            saleId: newSale.id,
            productName,
            quantity: formData.quantity,
          },
        });

        if (invoiceResult.success && invoiceResult.invoice) {
          await actions.updateSale(newSale.id, { invoiceId: invoiceResult.invoice.id });
        }
      } catch (invoiceError) {
        console.error('Invoice generation failed:', invoiceError);
        // Don't fail the sale creation for invoice errors
      }

      // Send email notification (non-blocking)
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            to: buyer.email,
            subject: `Order Confirmation - ${productName}`,
            content: `Dear ${buyer.name},<br><br>Thank you for your purchase of ${productName}.<br><br>Quantity: ${formData.quantity}<br>Total Price: ${totalPrice}<br><br>Best regards,<br>Jysk Streaming Team`,
          }),
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail for email errors
      }

      // Handle payment redirects
      if (invoiceResult?.paymentLink) {
        if (formData.paymentMethod === 'mobilepay') {
          window.location.href = invoiceResult.paymentLink;
          return;
        } else if (formData.paymentMethod === 'revolut') {
          alert(`Revolut payment link: ${invoiceResult.paymentLink}`);
        }
      }

      alert('Sale recorded successfully!');
      resetForm();

    } catch (error) {
      console.error("Error saving sale:", error);
      alert(`Error saving sale: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingSale(null);
    setShowForm(false);
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setFormData({
      productType: sale.productType,
      productId: sale.productId,
      buyerType: sale.buyerType,
      buyerId: sale.buyerId,
      quantity: sale.quantity,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this sale?')) {
      try {
        await actions.deleteSale(id);
      } catch (error) {
        console.error("Error deleting sale:", error);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'received': return 'bg-green-100 text-green-800';
      case 'due': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ShoppingCart className="mr-3 text-orange-600" />
            Sales Management
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Centralized revenue management with real-time inventory validation and comprehensive transaction tracking
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
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Record Sale
          </button>
        </div>
      </div>

      {/* Key Metrics Cards - Optimized for smaller screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Revenue</p>
            <p className="text-lg font-bold text-gray-900 mt-1 truncate" title={formatCurrencyWithState(totalRevenue)}>
              {formatCurrencyWithState(totalRevenue)}
            </p>
            <div className="flex items-center mt-2">
              <span className="text-xs text-green-600 font-medium">+8.2%</span>
              <span className="text-xs text-gray-500 ml-1">vs last month</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Profit</p>
            <p className="text-lg font-bold text-gray-900 mt-1 truncate" title={formatCurrencyWithState(totalProfit)}>
              {formatCurrencyWithState(totalProfit)}
            </p>
            <div className="flex items-center mt-2">
              <span className="text-xs text-blue-600 font-medium">
                {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%
              </span>
              <span className="text-xs text-gray-500 ml-1">margin</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Sales</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{totalSales}</p>
            <div className="flex items-center mt-2">
              <span className="text-xs text-purple-600 font-medium">{completedSales} done</span>
              <span className="text-xs text-gray-500 ml-1">• {pendingSales} pending</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Outstanding</p>
            <p className="text-lg font-bold text-gray-900 mt-1 truncate" title={formatCurrencyWithState(outstandingAmount)}>
              {formatCurrencyWithState(outstandingAmount)}
            </p>
            <div className="flex items-center mt-2">
              <span className="text-xs text-orange-600 font-medium">Payment due</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Calendar className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Average Sale</p>
            <p className="text-lg font-bold text-gray-900 mt-1 truncate" title={formatCurrencyWithState(totalSales > 0 ? totalRevenue / totalSales : 0)}>
              {formatCurrencyWithState(totalSales > 0 ? totalRevenue / totalSales : 0)}
            </p>
            <div className="flex items-center mt-2">
              <span className="text-xs text-indigo-600 font-medium">per transaction</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
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
        </div>
      </div>

      {/* Sales Table */}
      <div>
        <DataTable
          data={sortedSales}
          columns={[
            {
              key: 'productName',
              label: 'Product',
              render: (value, sale) => (
                <div>
                  <div className="text-sm font-medium text-gray-900">{sale.productName}</div>
                  <div className="text-sm text-gray-500 capitalize">{sale.productType?.replace('_', ' ')}</div>
                </div>
              )
            },
            {
              key: 'buyerName',
              label: 'Buyer',
              render: (value, sale) => (
                <div className="flex items-center">
                  {getBuyerTypeIcon(sale.buyerType)}
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{sale.buyerName}</div>
                    <div className="text-sm text-gray-500 capitalize">{sale.buyerType}</div>
                  </div>
                </div>
              )
            },
            { key: 'quantity', label: 'Quantity', sortable: true },
            {
              key: 'unitPrice',
              label: 'Unit Price',
              sortable: true,
              render: (value) => formatCurrencyWithState(value)
            },
            {
              key: 'totalPrice',
              label: 'Total',
              sortable: true,
              render: (value) => (
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrencyWithState(value)}
                </span>
              )
            },
            {
              key: 'profit',
              label: 'Profit',
              sortable: true,
              render: (value, sale) => (
                <span className={`text-sm font-medium ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrencyWithState(value)}
                </span>
              )
            },
            {
              key: 'status',
              label: 'Status',
              sortable: true,
              render: (value) => (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(value || 'unknown')}`}>
                  {value || 'Unknown'}
                </span>
              )
            },
            {
              key: 'paymentStatus',
              label: 'Payment',
              sortable: true,
              render: (value) => (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(value || 'unknown')}`}>
                  {value || 'Unknown'}
                </span>
              )
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (_, sale) => (
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleEdit(sale)}
                    className="text-gray-600 hover:text-gray-700 p-1 rounded"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(sale.id)}
                    className="text-red-600 hover:text-red-700 p-1 rounded"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            }
          ]}
          searchKeys={['productName', 'buyerName']}
          pageSize={25}
          emptyMessage="No sales found"
          className="shadow-lg border border-gray-200"
        />
      </div>

      {/* Add/Edit Sale Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingSale ? 'Edit Sale' : 'Record New Sale'}
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
                    <option value="subscription">Subscription</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buyer Type *
                  </label>
                  <select
                    name="buyerType"
                    value={formData.buyerType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="customer">Customer</option>
                    <option value="reseller">Reseller</option>
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
                    disabled={availableProducts.length === 0}
                  >
                    <option value="">Select a product</option>
                    {productOptions.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buyer *
                  </label>
                  <SearchableSelect
                    options={buyerOptions}
                    value={formData.buyerId}
                    onChange={(value) => setFormData(prev => ({ ...prev, buyerId: value }))}
                    placeholder="Search and select a buyer..."
                    className="w-full"
                    disabled={availableBuyers.length === 0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="mobilepay">MobilePay</option>
                    <option value="revolut">Revolut</option>
                    <option value="manual">Manual</option>
                    <option value="cash">Cash</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </div>

                {['manual', 'cash', 'paypal'].includes(formData.paymentMethod) && (
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
                    </select>
                  </div>
                )}
              </div>

              {/* Inventory Check Warning */}
              {formData.productId && (
                <InventoryWarning 
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
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Processing...' : (editingSale ? 'Update Sale' : 'Record Sale')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Inventory Warning Component
const InventoryWarning: React.FC<{
  productId: string;
  quantity: number;
  productType: string;
  availableProducts: (DigitalCode | TVBox | SubscriptionProduct)[];
}> = ({ productId, quantity, productType, availableProducts }) => {
  if (productType === 'subscription') return null;

  const product = availableProducts.find(p => p.id === productId) as DigitalCode | TVBox;
  if (!product) return null;

  const availableStock = product.quantity - (product.soldQuantity || 0);
  
  if (availableStock < quantity) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-red-800">Insufficient Inventory</h4>
            <p className="text-sm text-red-700">
              Available stock: {availableStock}, Requested: {quantity}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (availableStock <= 5) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800">Low Stock Warning</h4>
            <p className="text-sm text-yellow-700">
              Only {availableStock} units remaining in stock
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default EnhancedUnifiedSalesModule;
