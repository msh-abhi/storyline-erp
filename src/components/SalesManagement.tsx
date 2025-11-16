import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, ShoppingCart, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useApp } from '../context/AppContext';
import { Sale, DigitalCode, TVBox, SubscriptionProduct, Customer, Reseller } from '../types';
import { formatCurrency, calculateTotalRevenue, calculateInventoryProfit, calculateOutstandingAmount } from '../utils/calculations';
import SearchableSelect from './common/SearchableSelect';
import { mobilepayService } from '../services/mobilepayService';

import { generateInvoice } from '../utils/invoiceGenerator';

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
      paymentMethod: 'mobilepay' as 'mobilepay' | 'revolut' | 'manual' | 'cash' | 'paypal',
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

    // Convert buyers to SearchableSelect format
    const buyerOptions = availableBuyers.map(buyer => ({
      id: buyer.id,
      label: buyer.name,
      email: buyer.email
    }));

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

        if (!product || !buyer) {
          toast.error('Please select a valid product and buyer.');
          return;
        }

        let unitPrice = 0;
        let productName = '';
        let purchasePrice = 0;

        if (formData.productType === 'subscription') {
          const subProd = product as SubscriptionProduct;
          unitPrice = subProd.price;
          productName = subProd.name;
        } else {
          const stockProd = product as DigitalCode | TVBox;
          unitPrice = formData.buyerType === 'customer' ? (stockProd.customerPrice || 0) : (stockProd.resellerPrice || 0);
          productName = 'name' in stockProd ? stockProd.name : stockProd.model;
          purchasePrice = stockProd.purchasePrice || 0;
        }

        // Validate that we have a valid unit price
        if (!unitPrice || unitPrice <= 0) {
          toast.error('Selected product does not have a valid price. Please check product pricing.');
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

        try {
                    const newSale = await actions.createSale(saleData);
                    if (!newSale) throw new Error('Failed to create sale.');

                    // Send email notification
                    try {
                      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        },
                        body: JSON.stringify({
                          to: buyer.email,
                          subject: `Your order confirmation for ${productName}`,
                          content: `Dear ${buyer.name},<br><br>Thank you for your purchase of ${productName}.<br><br>Quantity: ${formData.quantity}<br>Total Price: ${totalPrice}<br><br>Best regards,<br>Jysk Streaming Team`,
                        }),
                      });
                    } catch (emailError) {
                      console.error('Failed to send email notification:', emailError);
                      // Do not block the UI for email errors
                    }

          const invoiceResult = await generateInvoice({
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

          if (!invoiceResult.success || !invoiceResult.invoice) {
            throw new Error(invoiceResult.error || 'Failed to generate invoice.');
          }

          await actions.updateSale(newSale.id, { invoiceId: invoiceResult.invoice.id });

          if (formData.productType === 'digital_code' || formData.productType === 'tv_box') {
            const stockProduct = product as DigitalCode | TVBox;
            const updatedStock = { soldQuantity: (stockProduct.soldQuantity || 0) + formData.quantity };
            if (formData.productType === 'digital_code') {
              await actions.updateDigitalCode(product.id, updatedStock);
            } else {
              await actions.updateTVBox(product.id, updatedStock);
            }
          }

          // Handle MobilePay payment links
          if (formData.paymentMethod === 'mobilepay') {
            try {
              // Create MobilePay payment link
              const mobilepayResult = await mobilepayService.createPaymentLink({
                externalId: newSale.id,
                amount: totalPrice,
                currency: state.settings?.currency || 'DKK',
                description: `Payment for ${productName}`,
                customerEmail: buyer.email,
                customerName: buyer.name,
                saleId: newSale.id,
              });

              if (mobilepayResult.success && mobilepayResult.data?.paymentLink) {
                // Send email with payment link
                try {
                  await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                      to: buyer.email,
                      subject: `Your MobilePay payment link for ${productName}`,
                      content: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                          <h2>Payment Link</h2>
                          <p>Dear ${buyer.name},</p>
                          <p>Thank you for your purchase of <strong>${productName}</strong>.</p>
                          <p><strong>Amount:</strong> ${totalPrice} ${state.settings?.currency || 'DKK'}</p>
                          <p><strong>Quantity:</strong> ${formData.quantity}</p>
                          <p>Please click the link below to complete your payment via MobilePay:</p>
                          <div style="text-align: center; margin: 20px 0;">
                            <a href="${mobilepayResult.data.paymentLink}"
                               style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                              Pay with MobilePay
                            </a>
                          </div>
                          <p><small>This link will expire in 24 hours.</small></p>
                          <p>Best regards,<br>StoryLine ERP Team</p>
                        </div>
                      `,
                    }),
                  });
                  toast.success('Sale recorded successfully! Payment link sent to customer email.');
                } catch (emailError) {
                  console.error('Failed to send MobilePay email:', emailError);
                  toast.info(`Sale recorded! Payment link: ${mobilepayResult.data.paymentLink}`);
                }
              } else {
                throw new Error(mobilepayResult.error || 'Failed to create MobilePay payment link');
              }
            } catch (mobilepayError) {
              console.error('MobilePay error:', mobilepayError);
              toast.error(`Sale recorded, but failed to create MobilePay payment link: ${mobilepayError instanceof Error ? mobilepayError.message : 'Unknown error'}`);
            }
          } else if (invoiceResult.paymentLink && formData.paymentMethod === 'revolut') {
            toast.info(`Revolut payment link generated: ${invoiceResult.paymentLink}. Please send this to the customer.`);
          } else {
            toast.success('Sale recorded successfully!');
          }

          resetForm();

        } catch (error) {
          console.error("Error saving sale:", error);
          toast.error(`Error saving sale: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      paymentMethod: sale.paymentMethod,
      status: sale.status,
    });
    setShowForm(true);
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

  const handleDelete = async (id: string) => {
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

  const totalRevenue = calculateTotalRevenue(state.sales);
  const totalProfit = calculateInventoryProfit(state.sales);
  const totalSales = state.sales.length;
  const outstandingAmount = calculateOutstandingAmount(state.sales);

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
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue, state.settings?.currency, state.exchangeRates, state.settings?.displayCurrency)}</p>
              <p className="text-sm text-gray-600">Total Revenue</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalProfit, state.settings?.currency, state.exchangeRates, state.settings?.displayCurrency)}</p>
              <p className="text-sm text-gray-600">Total Profit</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(outstandingAmount, state.settings?.currency, state.exchangeRates, state.settings?.displayCurrency)}</p>
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
                          ? `${(product as SubscriptionProduct).name} - ${formatCurrency((product as SubscriptionProduct).price, state.settings?.currency, state.exchangeRates, state.settings?.displayCurrency)}`
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
                  <SearchableSelect
                    options={buyerOptions}
                    value={formData.buyerId}
                    onChange={(value) => setFormData(prev => ({ ...prev, buyerId: value }))}
                    placeholder="Search and select a buyer..."
                    className="w-full"
                  />
                </div>
              </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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

                                                  Payment Method *

                                                </label>

                                                <select

                                                  name="paymentMethod"

                                                  value={formData.paymentMethod}

                                                  onChange={handleChange}

                                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                                                >

                                                  <option value="mobilepay">MobilePay</option>

                                                  <option value="manual">Manual</option>

                                                  <option value="cash">Cash</option>

                                                  <option value="paypal">PayPal</option>

                                                  <option value="revolut">Revolut</option>

                                                </select>

                                              </div>

                                              {['manual', 'cash', 'paypal'].includes(formData.paymentMethod) && (

                                                <div>

                                                  <label className="block text-sm font-medium text-gray-700 mb-1">

                                                    Status *

                                                  </label>

                                                  <select

                                                    name="status"

                                                    value={formData.status}

                                                    onChange={handleChange}

                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                                                  >

                                                    <option value="completed">Completed</option>

                                                    <option value="pending">Pending</option>

                                                  </select>

                                                </div>

                                              )}
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
                      {formatCurrency(sale.unitPrice, state.settings?.currency, state.exchangeRates, state.settings?.displayCurrency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                      {formatCurrency(sale.totalPrice, state.settings?.currency, state.exchangeRates, state.settings?.displayCurrency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${sale.profit > 0 ? 'text-green-600' : sale.profit < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(sale.profit, state.settings?.currency, state.exchangeRates, state.settings?.displayCurrency)}
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
                        {sale.status === 'pending' && (
                          <button
                            onClick={() => handleMarkAsComplete(sale.id)}
                            className="text-green-600 hover:text-green-700 p-1"
                            title="Mark as Complete"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(sale)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sale.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                          title="Delete"
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
