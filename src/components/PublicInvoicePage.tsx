import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Invoice, SupportedCurrency } from '../types';
import { formatCurrency } from '../utils/calculations';
import { mobilepayService } from '../services/mobilepayService';

const PublicInvoicePage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentInProgress, setPaymentInProgress] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceId) {
        setError('No invoice ID provided.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Invoice not found.');

        setInvoice(data as Invoice);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to fetch invoice: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  const handleMobilePayPayment = async () => {
    if (!invoice) return;

    setPaymentInProgress(true);
    setError(null);

    const redirectUri = `${window.location.origin}/mobilepay-callback`;

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
      setPaymentInProgress(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  }

  if (!invoice) {
    return <div className="min-h-screen flex items-center justify-center">Invoice not found.</div>;
  }

  const isPayable = invoice.status === 'pending' && invoice.paymentMethod === 'mobilepay';

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Invoice {invoice.id.substring(0, 8)}...</h1>
        <p className="text-gray-500 mb-6">Issued on: {new Date(invoice.issuedDate).toLocaleDateString()}</p>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase">Billed To</h2>
            <p className="text-gray-800 font-medium">{invoice.metadata?.customerName}</p>
            <p className="text-gray-600">{invoice.metadata?.customerEmail}</p>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-semibold text-gray-500 uppercase">Total Amount</h2>
            <p className="text-3xl font-bold text-gray-800">{formatCurrency(invoice.amount, invoice.currency)}</p>
          </div>
        </div>

        <div className="border-t pt-6">
          {invoice.status === 'paid' && (
            <div className="text-center p-4 bg-green-100 text-green-800 rounded-lg">
              <h3 className="font-bold">This invoice has been paid. Thank you!</h3>
            </div>
          )}

          {invoice.status === 'cancelled' && (
            <div className="text-center p-4 bg-red-100 text-red-800 rounded-lg">
              <h3 className="font-bold">This invoice has been cancelled.</h3>
            </div>
          )}

          {isPayable && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">Click the button below to complete your payment securely with MobilePay.</p>
              <button
                onClick={handleMobilePayPayment}
                disabled={paymentInProgress}
                className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all disabled:bg-gray-400"
              >
                {paymentInProgress ? 'Processing...' : 'Pay with MobilePay'}
              </button>
            </div>
          )}

          {invoice.paymentMethod === 'revolut' && invoice.status === 'pending' && (
            <div>
              <h3 className="font-bold text-lg mb-2">Bank Transfer Details</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p>Please transfer the total amount to the bank account below, and include the invoice ID in the transfer reference.</p>
                {/* These details should come from settings in a real app */}
                <p className="mt-2"><strong>Account Holder:</strong> Your Company Name</p>
                <p><strong>IBAN:</strong> YOUR_IBAN_HERE</p>
                <p><strong>SWIFT/BIC:</strong> YOUR_SWIFT_CODE_HERE</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicInvoicePage;
