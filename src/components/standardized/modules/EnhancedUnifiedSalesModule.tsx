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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

      // Update inventory ONLY for completed (cash/manual/paypal) sales.
      // For MobilePay/Revolut, stock is reserved when admin marks sale as complete after payment.
      const isCompletedOnCreation = isOfflinePayment && formData.status === 'completed';
      if (isCompletedOnCreation && (formData.productType === 'digital_code' || formData.productType === 'tv_box')) {
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

      // Handle MobilePay: email the payment link to the CUSTOMER, never redirect the admin
      if (invoiceResult?.paymentLink && formData.paymentMethod === 'mobilepay') {
        try {
          const emailPayload = {
            to: buyer.email,
            subject: `Din MobilePay betalingslink for ${productName}`,
            content: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif"><table role="presentation" style="width:100%;background:#f5f5f5;padding:20px 0"><tr><td align="center"><table role="presentation" style="max-width:560px;width:100%;background:#fff;border-radius:10px"><tr><td style="padding:30px 40px;background:linear-gradient(135deg,#5a31f4,#7c3aed);border-radius:10px 10px 0 0;text-align:center"><h1 style="margin:0;color:#fff;font-size:22px">Jysk Streaming</h1></td></tr><tr><td style="padding:36px 40px"><h2 style="margin:0 0 16px;color:#1a1a1a;font-size:20px">Betalingslink</h2><p style="margin:0 0 8px;color:#333">Kære ${buyer.name},</p><p style="margin:0 0 20px;color:#333">Tak for dit køb af <strong>${productName}</strong>.</p><table style="width:100%;border-collapse:collapse;margin:0 0 24px"><tr><td style="padding:8px 12px;background:#f8f8f8;border-radius:6px 6px 0 0;color:#555;width:50%">Antal</td><td style="padding:8px 12px;background:#f8f8f8;border-radius:6px 6px 0 0;font-weight:bold;color:#1a1a1a">${formData.quantity}</td></tr><tr><td style="padding:8px 12px;border-top:1px solid #eee;color:#555">Beløb</td><td style="padding:8px 12px;border-top:1px solid #eee;font-weight:bold;color:#1a1a1a">${totalPrice} ${state.settings?.currency || 'DKK'}</td></tr></table><p style="margin:0 0 24px;color:#333">Klik på knappen nedenfor for at betale via MobilePay:</p><div style="text-align:center;margin:0 0 28px"><a href="${invoiceResult.paymentLink}" style="background:#5a31f4;color:#fff;padding:14px 40px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;display:inline-block">Betal med MobilePay</a></div><p style="margin:0 0 4px;color:#999;font-size:13px">Linket udløber om 24 timer.</p></td></tr><tr><td style="padding:20px 40px;background:#f8f8f8;border-radius:0 0 10px 10px;text-align:center"><p style="margin:0;color:#666;font-size:14px"><strong>Med venlig hilsen<br>Jysk Streaming</strong></p></td></tr></table></td></tr></table></body></html>`,
          };

          const emailResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(emailPayload),
          });

          if (emailResponse.ok) {
            alert(`✅ Salg registreret!\n\nBetalingslink sendt til kundens e-mail: ${buyer.email}\n\nLink (til reference): ${invoiceResult.paymentLink}`);
          } else {
            // Email failed — show admin the link so they can share it manually
            alert(`✅ Salg registreret, men e-mail fejlede.\n\nGiv kunden dette MobilePay-link manuelt:\n${invoiceResult.paymentLink}`);
          }
        } catch (emailError) {
          console.error('Failed to send MobilePay email to customer:', emailError);
          alert(`✅ Salg registreret, men e-mail fejlede.\n\nGiv kunden dette MobilePay-link manuelt:\n${invoiceResult.paymentLink}`);
        }
      } else if (invoiceResult?.paymentLink && formData.paymentMethod === 'revolut') {
        alert(`Revolut payment link generated. Send this to the customer:\n${invoiceResult.paymentLink}`);
      } else {

        alert('Sale recorded successfully!');
      }

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
    if (deletingId) return; // prevent double-click

    const saleToDelete = state.sales.find(sale => sale.id === id);
    if (!saleToDelete) return;

    const isPending = saleToDelete.status === 'pending';
    const confirmMsg = isPending
      ? 'Delete this pending sale? (No stock changes — payment was never completed.) Any related invoices will also be removed.'
      : 'Delete this completed sale? Stock will be restored and related invoices will be removed.';

    if (!window.confirm(confirmMsg)) return;

    setDeletingId(id);
    try {
      // Only restore stock if the sale was completed (stock was previously reduced)
      if (saleToDelete.status === 'completed' &&
        (saleToDelete.productType === 'digital_code' || saleToDelete.productType === 'tv_box')) {
        const currentStock = saleToDelete.productType === 'digital_code'
          ? state.digitalCodes.find(code => code.id === saleToDelete.productId)
          : state.tvBoxes.find(box => box.id === saleToDelete.productId);

        if (currentStock) {
          const restoredSoldQuantity = Math.max(0, (currentStock.soldQuantity || 0) - saleToDelete.quantity);
          if (saleToDelete.productType === 'digital_code') {
            await actions.updateDigitalCode(saleToDelete.productId, { soldQuantity: restoredSoldQuantity });
          } else {
            await actions.updateTVBox(saleToDelete.productId, { soldQuantity: restoredSoldQuantity });
          }
        }
      }

      // If this sale has an associated invoice, delete it so it vanishes from the customer portal
      if (saleToDelete.invoiceId) {
        try {
          await actions.deleteInvoice(saleToDelete.invoiceId);
        } catch (invoiceErr) {
          console.error('Failed to delete associated invoice:', invoiceErr);
          // Optionally continue if invoice deletion fails, or handle it
        }
      }

      await actions.deleteSale(id);
      setTimeout(() => setDeletingId(null), 300);
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert(`Failed to delete sale: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDeletingId(null);
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
              sortable: false,
              render: (_, sale) => (
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(sale); }}
                    className="text-gray-600 hover:text-gray-700 p-1 rounded"
                    title="Edit"
                    disabled={!!deletingId}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(sale.id); }}
                    className={`p-1 rounded transition-colors ${deletingId === sale.id
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-red-600 hover:text-red-700'
                      }`}
                    title={deletingId === sale.id ? 'Deleting...' : 'Delete'}
                    disabled={!!deletingId}
                  >
                    {deletingId === sale.id
                      ? <span className="text-xs">...</span>
                      : <Trash2 size={16} />}
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
