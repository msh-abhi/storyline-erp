import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';
import { Invoice, SupportedCurrency } from '../types';
import { formatCurrency } from '../utils/calculations';
import { mobilepayService } from '../services/mobilepayService';

const CustomerPortalBilling: React.FC = () => {
  const { customerPortalUser } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentInProgress, setPaymentInProgress] = useState<string | null>(null); // Store the ID of the invoice being paid

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!customerPortalUser?.customer_id) {
        setError('Customer ID not found.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('invoices')
          .select('*')
          .eq('customer_id', customerPortalUser.customer_id)
          .order('issuedDate', { ascending: false });

        if (fetchError) throw fetchError;

        setInvoices(data as Invoice[]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to fetch invoices: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [customerPortalUser]);

  const handleMobilePayPayment = async (invoice: Invoice) => {
    setPaymentInProgress(invoice.id);
    setError(null);

    const redirectUri = `${window.location.origin}/mobilepay-callback`; // Or could be window.location.href to return to the same page

    try {
      const result = await mobilepayService.createRecurringPaymentAgreement({
        externalId: invoice.externalPaymentId || `inv_${invoice.id}`,
        customerId: invoice.customerId,
        subscriptionId: invoice.metadata?.productId || 'N/A',
        amount: invoice.amount,
        currency: invoice.currency as SupportedCurrency,
        redirectUri: redirectUri,
      });

      if (result.success && result.data?.redirectUri) {
        window.location.href = result.data.redirectUri;
      } else {
        throw new Error(result.error || 'Could not initiate MobilePay payment.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setPaymentInProgress(null);
    }
  };

  const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
  const pastInvoices = invoices.filter(inv => inv.status !== 'pending');

  if (loading) {
    return <div className="p-6">Loading billing history...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Billing History</h1>
      <p className="text-gray-600 mb-6">View your past invoices and upcoming payment schedule.</p>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        {/* Upcoming Bills */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Pending Invoices</h2>
          {pendingInvoices.length > 0 ? (
            <ul className="space-y-3">
              {pendingInvoices.map(invoice => (
                <li key={invoice.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-yellow-50 rounded-md">
                  <div>
                    <span className="font-medium">Invoice #{invoice.id.substring(0, 8)}...</span>
                    <span className="block sm:inline sm:ml-4 text-gray-600">Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center mt-2 sm:mt-0">
                    <span className="font-bold mr-4">{formatCurrency(invoice.amount, invoice.currency)}</span>
                    {invoice.paymentMethod === 'mobilepay' && (
                      <button
                        onClick={() => handleMobilePayPayment(invoice)}
                        disabled={paymentInProgress === invoice.id}
                        className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-all disabled:bg-gray-400"
                      >
                        {paymentInProgress === invoice.id ? 'Processing...' : 'Pay with MobilePay'}
                      </button>
                    )}
                    {invoice.paymentMethod !== 'mobilepay' && (
                        <span className="text-sm text-gray-500">Manual Payment</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 mt-4">You have no pending invoices.</p>
          )}
        </div>

        {/* Past Bills */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Billing History</h2>
          {pastInvoices.length > 0 ? (
            <ul className="space-y-3">
              {pastInvoices.map(invoice => (
                <li key={invoice.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                  <div>
                    <span className="font-medium">Invoice #{invoice.id.substring(0, 8)}...</span>
                    <span className={`ml-4 px-2 py-1 text-xs rounded-full ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {invoice.status}
                    </span>
                  </div>
                  <span>{formatCurrency(invoice.amount, invoice.currency)} - Paid: {new Date(invoice.updatedAt || invoice.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 mt-4">You have no past invoices.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerPortalBilling;
