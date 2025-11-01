import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';
import { Invoice, SupportedCurrency } from '../types';
import { formatCurrency } from '../utils/calculations';
import { mobilepayService } from '../services/mobilepayService';
import { revolutService } from '../services/revolutService';
import { CreditCard, Banknote, QrCode, AlertCircle, ExternalLink, Clock } from 'lucide-react';

const CustomerPortalBilling: React.FC = () => {
  const { customerPortalUser } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentInProgress, setPaymentInProgress] = useState<string | null>(null); // Store the ID of the invoice being paid
  const [revolutPaymentInProgress, setRevolutPaymentInProgress] = useState<string | null>(null); // Store the ID of the invoice being paid via Revolut
  const [showRevolutInstructions, setShowRevolutInstructions] = useState<string | null>(null); // Store the ID of the invoice showing Revolut instructions

  // Use type assertion to access the camelCase properties after keysToCamel conversion
  const portalUser = customerPortalUser as any;
  const hasCustomer = portalUser?.customerId && portalUser?.customerId !== null;

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!portalUser?.customerId) {
        setError('Customer ID not found.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('invoices')
          .select('*')
          .eq('customer_id', portalUser.customerId)
          .order('issued_date', { ascending: false });

        if (fetchError) {
          // Handle specific RLS permission errors
          if (fetchError.message.includes('row-level security') || fetchError.code === '42501') {
            setError('Invoice access policy not configured. Please contact support to set up invoice access permissions.');
          } else {
            setError(`Failed to fetch invoices: ${fetchError.message}`);
          }
        } else {
          setInvoices(data as Invoice[]);
        }
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

  const handleRevolutPayment = async (invoice: Invoice) => {
    setRevolutPaymentInProgress(invoice.id);
    setError(null);

    try {
      const result = await revolutService.createPaymentRequest({
        amount: invoice.amount,
        currency: invoice.currency as SupportedCurrency,
        reference: `Invoice_${invoice.id.substring(0, 8)}`,
        recipientEmail: customerPortalUser?.email || '',
      });

      if (result.success && result.data?.payment_request?.payment_url) {
        // Show instructions modal instead of direct redirect
        setShowRevolutInstructions(invoice.id);
        setRevolutPaymentInProgress(null);
      } else {
        throw new Error(result.error || 'Could not initiate Revolut payment request.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setRevolutPaymentInProgress(null);
    }
  };

  const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
  const pastInvoices = invoices.filter(inv => inv.status !== 'pending');

  if (!customerPortalUser || !hasCustomer) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Billing History</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No customer account is found for this user.</p>
          <p className="text-sm text-yellow-600 mt-2">
            Debug info: Portal User ID: {portalUser?.id || 'None'},
            Customer ID: {portalUser?.customerId || 'None'}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
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
                    <span className="block sm:inline sm:ml-4 text-gray-600">
                      Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Not specified'}
                    </span>
                  </div>
                  <div className="flex items-center mt-2 sm:mt-0">
                    <span className="font-bold mr-4">{formatCurrency(invoice.amount, invoice.currency, null)}</span>
                    
                    {/* Payment Options */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* MobilePay Option */}
                      <button
                        onClick={() => handleMobilePayPayment(invoice)}
                        disabled={paymentInProgress === invoice.id || revolutPaymentInProgress === invoice.id}
                        className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-all disabled:bg-gray-400 flex items-center gap-2"
                      >
                        <CreditCard size={16} />
                        {paymentInProgress === invoice.id ? 'Processing...' : 'MobilePay (Auto)'}
                      </button>
                      
                      {/* Revolut Manual Option */}
                      <button
                        onClick={() => handleRevolutPayment(invoice)}
                        disabled={paymentInProgress === invoice.id || revolutPaymentInProgress === invoice.id}
                        className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-all disabled:bg-gray-400 flex items-center gap-2"
                      >
                        <Banknote size={16} />
                        {revolutPaymentInProgress === invoice.id ? 'Creating...' : 'Revolut (Manual)'}
                      </button>
                    </div>
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
                  <span>{formatCurrency(invoice.amount, invoice.currency, null)} - Paid: {new Date(invoice.updatedAt || invoice.createdAt || new Date()).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 mt-4">You have no past invoices.</p>
          )}
        </div>
      </div>

      {/* Revolut Payment Instructions Modal */}
      {showRevolutInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Banknote className="text-green-600" size={24} />
                Revolut Payment Instructions
              </h3>
              <button 
                onClick={() => setShowRevolutInstructions(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 font-medium">Payment Request Created Successfully!</p>
                <p className="text-xs text-green-600 mt-1">Check your Revolut app for the payment request.</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <QrCode size={16} className="text-gray-500" />
                  <span className="text-sm font-medium">How to Pay:</span>
                </div>
                
                <ol className="text-sm text-gray-600 space-y-2 ml-6">
                  <li className="list-decimal">Open your Revolut app</li>
                  <li className="list-decimal">Go to "Payments" section</li>
                  <li className="list-decimal">Find "Requests" tab</li>
                  <li className="list-decimal">Look for payment request from StoryLine</li>
                  <li className="list-decimal">Review the amount and confirm payment</li>
                </ol>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Invoice:</span>
                    <span className="font-medium">{showRevolutInstructions.substring(0, 8)}...</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(
                        invoices.find(inv => inv.id === showRevolutInstructions)?.amount || 0,
                        invoices.find(inv => inv.id === showRevolutInstructions)?.currency || 'DKK',
                        null
                      )}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock size={14} />
                  <span>Payment requests typically expire within 24 hours</span>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    const url = `https://revolut.com/app/payments`;
                    window.open(url, '_blank');
                  }}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink size={16} />
                  Open Revolut App
                </button>
                <button
                  onClick={() => setShowRevolutInstructions(null)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-sm font-medium text-red-800">Payment Error</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPortalBilling;
