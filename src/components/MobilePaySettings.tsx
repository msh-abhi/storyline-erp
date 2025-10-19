import React, { useState } from 'react';
import { mobilepayService } from '../services/mobilepayService';
import { useAuth } from './AuthProvider';
import { SupportedCurrency } from '../types';

const MobilePaySettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { authUser } = useAuth();

  const handleCreateAgreement = async () => {
    if (!authUser) {
      setFeedback({ type: 'error', message: 'You must be logged in to create an agreement.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    // Construct the redirect URI for the callback
    const redirectUri = `${window.location.origin}/mobilepay-callback`;

    const payload = {
      externalId: `sub_agreement_${authUser.id}_${Date.now()}`,
      customerId: authUser.id,
      subscriptionId: 'dummy_subscription_123', // In a real app, this would be the actual subscription ID
      amount: 99.99, // Example amount
      currency: 'DKK' as SupportedCurrency,
      redirectUri: redirectUri,
    };

    try {
      const result = await mobilepayService.createRecurringPaymentAgreement(payload);

      if (result.success && result.data?.redirectUri) {
        setFeedback({ type: 'success', message: 'Redirecting to MobilePay...' });
        // Redirect the user to the MobilePay approval page
        window.location.href = result.data.redirectUri;
      } else {
        throw new Error(result.error || 'Failed to get redirect URI from MobilePay.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setFeedback({ type: 'error', message: `Failed to create agreement: ${errorMessage}` });
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mt-6">
      <h2 className="text-2xl font-semibold mb-4">MobilePay Recurring Payments</h2>
      <div className="border-t pt-4">
        <p className="mb-4 text-gray-600">
          Click the button below to set up a recurring payment agreement with MobilePay. This will redirect you to MobilePay to approve the agreement.
        </p>
        <button
          onClick={handleCreateAgreement}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
        >
          {isLoading ? 'Processing...' : 'Create MobilePay Agreement'}
        </button>
        {feedback && (
          <div className={`mt-4 p-3 rounded ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobilePaySettings;
