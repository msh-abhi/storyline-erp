import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Invoice, Customer, SubscriptionProduct } from '../types';

interface CreateInvoiceFormProps {
  onClose: () => void;
}

const CreateInvoiceForm: React.FC<CreateInvoiceFormProps> = ({ onClose }) => {
  const { state, actions } = useApp();
  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'manual' | 'mobilepay' | 'revolut'>('manual');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!customerId || !productId) {
      setError('Please select a customer and a product.');
      setIsLoading(false);
      return;
    }

    const customer = state.customers.find(c => c.id === customerId);
    const product = state.subscriptionProducts.find(p => p.id === productId);

    if (!customer || !product) {
      setError('Selected customer or product not found.');
      setIsLoading(false);
      return;
    }

    try {
      // The actual invoice creation logic should be in the AppContext actions
      await actions.createInvoice({
        customerId: customer.id,
        amount: product.price,
        status: 'pending',
        currency: state.settings?.currency || 'DKK',
        paymentMethod: paymentMethod,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // Due in 14 days
        issuedDate: new Date().toISOString(),
        metadata: {
          customerName: customer.name,
          customerEmail: customer.email,
          productName: product.name,
          productId: product.id,
        },
        // This is where you might generate a unique ID for the payment provider
        externalPaymentId: paymentMethod !== 'manual' ? `${paymentMethod}_${Date.now()}` : undefined,
      } as Omit<Invoice, 'id'>);

      alert('Invoice created successfully!');
      onClose();
      actions.loadAllData(); // Refresh the invoice list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to create invoice: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
        <h3 className="text-2xl font-semibold text-gray-900 mb-6">Create New Invoice</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>Select a customer</option>
              {state.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Product</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>Select a product</option>
              {state.subscriptionProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.price} {state.settings?.currency}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="manual">Manual</option>
              <option value="mobilepay">MobilePay</option>
              <option value="revolut">Revolut (Manual)</option>
            </select>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-end pt-4 space-x-3 border-t mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
              {isLoading ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateInvoiceForm;
