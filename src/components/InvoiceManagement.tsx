import { useState } from 'react';
import { Trash2, Search, DollarSign, FileText, CheckCircle, Clock, XCircle, RefreshCw, ExternalLink, Eye, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Invoice, PaymentTransaction } from '../types';
import { formatCurrency } from '../utils/calculations';
import CreateInvoiceForm from './CreateInvoiceForm';

export default function InvoiceManagement() {
  const { state, actions } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled' | 'refunded'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'mobilepay' | 'revolut' | 'manual'>('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isRefreshingRevolut, setIsRefreshingRevolut] = useState(false);

  const filteredInvoices = state.invoices.filter(invoice => {
    const matchesSearch =
      invoice.metadata?.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.metadata?.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.externalPaymentId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesPaymentMethod = paymentMethodFilter === 'all' || invoice.paymentMethod === paymentMethodFilter;

    return matchesSearch && matchesStatus && matchesPaymentMethod;
  });

  const getStatusBadge = (status: Invoice['status']) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-purple-100 text-purple-800',
    };
    return (
      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'cancelled':
      case 'refunded': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    if (confirm(`Are you sure you want to mark invoice ${invoice.id} as PAID?`)) {
      try {
        const updatedInvoice = await actions.updateInvoice(invoice.id, { status: 'paid' });
        if (updatedInvoice) {
            await actions.addPaymentTransaction({
              invoiceId: updatedInvoice.id,
              customerId: updatedInvoice.customerId,
              paymentMethod: updatedInvoice.paymentMethod,
              amount: updatedInvoice.amount,
              currency: updatedInvoice.currency,
              status: 'paid',
              transactionId: `MANUAL-${Date.now()}`,
              providerResponse: { message: 'Manually marked as paid' },
              transactionDate: new Date().toISOString(),
            });
            alert('Invoice marked as paid and payment transaction recorded.');
            actions.loadAllData();
        }
      } catch (error) {
        console.error('Error marking invoice as paid:', error);
        alert('Failed to mark invoice as paid.');
      }
    }
  };

  const handleCheckRevolutStatus = async (invoice: Invoice) => {
    if (!invoice.externalPaymentId) {
      alert('No Revolut Payment Request ID found for this invoice.');
      return;
    }
    setIsRefreshingRevolut(true);
    try {
      const result = await actions.revolut.getPaymentStatus(invoice.externalPaymentId);
      if (result && result.success && result.data) {
        const revolutStatus = result.data.state;
        let newInvoiceStatus: Invoice['status'] = invoice.status;
        let newTransactionStatus: PaymentTransaction['status'] = 'pending';

        if (revolutStatus === 'COMPLETED') {
          newInvoiceStatus = 'paid';
          newTransactionStatus = 'paid';
        } else if (revolutStatus === 'CANCELLED' || revolutStatus === 'FAILED') {
          newInvoiceStatus = 'cancelled';
          newTransactionStatus = 'failed';
        }

        if (newInvoiceStatus !== invoice.status) {
          await actions.updateInvoice(invoice.id, { status: newInvoiceStatus });
          const existingTransaction = state.paymentTransactions.find(t => t.transactionId === invoice.externalPaymentId);
          if (existingTransaction) {
            await actions.updatePaymentTransaction(existingTransaction.id, { status: newTransactionStatus, providerResponse: result.data });
          } else {
            await actions.addPaymentTransaction({
              invoiceId: invoice.id,
              customerId: invoice.customerId,
              paymentMethod: 'revolut',
              amount: invoice.amount,
              currency: invoice.currency,
              status: newTransactionStatus,
              transactionId: invoice.externalPaymentId,
              providerResponse: result.data,
              transactionDate: new Date().toISOString(),
            });
          }
          alert(`Revolut payment status updated to: ${revolutStatus}`);
          actions.loadAllData();
        } else {
          alert(`Revolut payment status is still: ${revolutStatus}`);
        }
      } else {
        alert(result?.error || 'Failed to check Revolut payment status.');
      }
    } catch (error) {
      console.error('Error checking Revolut status:', error);
      alert('Failed to check Revolut payment status.');
    } finally {
      setIsRefreshingRevolut(false);
    }
  };

  const totalPaidAmount = filteredInvoices.filter(inv => inv.status === 'paid').reduce((total, inv) => total + inv.amount, 0);
  const totalPendingAmount = filteredInvoices.filter(inv => inv.status === 'pending').reduce((total, inv) => total + inv.amount, 0);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Invoice Management</h2>
          <p className="text-gray-600 mt-2">Manage all generated invoices and track payments</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{filteredInvoices.length}</p>
              <p className="text-sm text-gray-600">Total Invoices</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPaidAmount, state.settings?.currency || 'DKK', state.exchangeRates || null, state.settings?.currency)}</p>
              <p className="text-sm text-gray-600">Total Paid</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPendingAmount, state.settings?.currency || 'DKK', state.exchangeRates || null, state.settings?.currency)}</p>
              <p className="text-sm text-gray-600">Total Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer, ID, or external ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Methods</option>
              <option value="mobilepay">MobilePay</option>
              <option value="revolut">Revolut</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No invoices found</p>
            <p className="text-gray-400">Invoices will appear here once generated for subscriptions or other services.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(invoice.status)}
                        {getStatusBadge(invoice.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{invoice.id.substring(0, 8)}...</div>
                      {invoice.externalPaymentId && <div className="text-xs text-gray-500">Ext ID: {invoice.externalPaymentId.substring(0, 8)}...</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{invoice.metadata?.customerName || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{invoice.metadata?.customerEmail || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{formatCurrency(invoice.amount, invoice.currency, state.exchangeRates || null, state.settings?.currency)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${invoice.paymentMethod === 'mobilepay' ? 'bg-blue-100 text-blue-800' : invoice.paymentMethod === 'revolut' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {invoice.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => handleViewDetails(invoice)} className="text-blue-600 hover:text-blue-700 p-1" title="View Details"><Eye className="h-4 w-4" /></button>
                        {invoice.paymentLink && <a href={invoice.paymentLink} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 p-1" title="Open Payment Link"><ExternalLink className="h-4 w-4" /></a>}
                        {invoice.paymentMethod === 'manual' && invoice.status === 'pending' && <button onClick={() => handleMarkAsPaid(invoice)} className="text-emerald-600 hover:text-emerald-700 p-1" title="Mark as Paid"><CheckCircle className="h-4 w-4" /></button>}
                        {invoice.paymentMethod === 'revolut' && invoice.status === 'pending' && <button onClick={() => handleCheckRevolutStatus(invoice)} disabled={isRefreshingRevolut} className="text-purple-600 hover:text-purple-700 p-1 disabled:opacity-50" title="Check Revolut Status"><RefreshCw className={`h-4 w-4 ${isRefreshingRevolut ? 'animate-spin' : ''}`} /></button>}
                        <button onClick={() => actions.deleteInvoice(invoice.id)} className="text-red-600 hover:text-red-700 p-1" title="Delete Invoice"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateForm && <CreateInvoiceForm onClose={() => setShowCreateForm(false)} />}

      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Invoice Details</h3>
                <div className="flex items-center space-x-2 mt-2">
                  {getStatusIcon(selectedInvoice.status)}
                  {getStatusBadge(selectedInvoice.status)}
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="h-6 w-6" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice ID</label>
                  <p className="text-gray-900">{selectedInvoice.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <p className="text-gray-900">{selectedInvoice.metadata?.customerName || 'N/A'}</p>
                  <p className="text-sm text-gray-600">{selectedInvoice.metadata?.customerEmail || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <p className="text-gray-900 font-bold text-lg">{formatCurrency(selectedInvoice.amount, selectedInvoice.currency, state.exchangeRates || null, state.settings?.currency)}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <p className="text-gray-900">{selectedInvoice.paymentMethod}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issued Date</label>
                  <p className="text-gray-900">{new Date(selectedInvoice.issuedDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <p className="text-gray-900">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                </div>
                {selectedInvoice.externalPaymentId && <div><label className="block text-sm font-medium text-gray-700 mb-1">External Payment ID</label><p className="text-sm text-gray-600 font-mono">{selectedInvoice.externalPaymentId}</p></div>}
                {selectedInvoice.paymentLink && <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Link</label><a href={selectedInvoice.paymentLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center space-x-1"><span>Open Link</span> <ExternalLink className="h-4 w-4" /></a></div>}
              </div>
            </div>
            {selectedInvoice.metadata && Object.keys(selectedInvoice.metadata).length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Metadata</label>
                <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto">{JSON.stringify(selectedInvoice.metadata, null, 2)}</pre>
              </div>
            )}
            <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
              <button onClick={() => setShowDetailModal(false)} className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
