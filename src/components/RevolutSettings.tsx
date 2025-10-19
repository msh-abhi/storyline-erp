import React, { useState } from 'react';
import { revolutService } from '../services/revolutService';
import { SupportedCurrency } from '../types';

const RevolutSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; data?: any } | null>(null);
  const [amount, setAmount] = useState('25.00');

  const handleCreatePaymentRequest = async () => {
    setIsLoading(true);
    setFeedback(null);

    const payload = {
      amount: parseFloat(amount),
      currency: 'EUR' as SupportedCurrency, // Revolut often defaults to major currencies
      reference: `order_ref_${Date.now()}`, // Your internal order ID
      recipientEmail: 'testcustomer@example.com', // In a real app, get this from customer data
      recipientName: 'Test Customer',
    };

    try {
      const result = await revolutService.createPaymentRequest(payload);

      if (result.success && result.data) {
        setFeedback({
          type: 'success',
          message: 'Successfully created Revolut payment request!',
          data: result.data,
        });
        // In a real app, you might store the payment request ID or redirect the user
        console.log('Revolut Payment Request Created:', result.data);
      } else {
        throw new Error(result.error || 'Failed to create Revolut payment request.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setFeedback({ type: 'error', message: `Failed to create request: ${errorMessage}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mt-6">
      <h2 className="text-2xl font-semibold mb-4">Revolut Payments</h2>
      <div className="border-t pt-4">
        <p className="mb-4 text-gray-600">
          Create a Revolut payment request. In a real application, this would be part of a checkout flow where customer details are automatically populated.
        </p>
        <div className="mb-4">
          <label htmlFor="revolut-amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount (EUR)
          </label>
          <input
            type="number"
            id="revolut-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 25.00"
          />
        </div>
        <button
          onClick={handleCreatePaymentRequest}
          disabled={isLoading}
          className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
        >
          {isLoading ? 'Processing...' : 'Create Revolut Payment Request'}
        </button>
        {feedback && (
          <div className={`mt-4 p-3 rounded ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <p className="font-bold">{feedback.message}</p>
            {feedback.data && (
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(feedback.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RevolutSettings;
