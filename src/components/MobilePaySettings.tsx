import React, { useState } from 'react';
import { mobilepayService } from '../services/mobilepayService';
import { useAuth } from './AuthProvider';
import { SupportedCurrency } from '../types';

const MobilePaySettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [singlePaymentFeedback, setSinglePaymentFeedback] = useState<{ type: 'success' | 'error'; message: string, link?: string } | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('4791234567'); // Example phone number, ideally from user profile
  const { authUser } = useAuth();

  const handleCreateSinglePayment = async () => {
    setIsLoading(true);
    setSinglePaymentFeedback(null);

    const payload = {
      externalId: 'will-be-overwritten', // This is overwritten by the service, but required by the type
      amount: 4999, // 49.99 DKK in minor units (øre)
      currency: 'DKK' as SupportedCurrency,
      description: 'Test One-Time Purchase',
      saleId: `test-sale-${Math.random().toString(36).substring(2, 9)}`,
    };

    try {
      const result = await mobilepayService.createPaymentLink(payload);

      if (result.success && result.data?.paymentLink) {
        setSinglePaymentFeedback({
          type: 'success',
          message: 'Successfully created payment link:',
          link: result.data.paymentLink
        });
      } else {
        throw new Error(result.error || 'Failed to get payment link from MobilePay.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setSinglePaymentFeedback({ type: 'error', message: `Failed to create link: ${errorMessage}` });
    } finally {
      setIsLoading(false);
    }
  };


  const handleCreateAgreement = async () => {
    if (!authUser) {
      setFeedback({ type: 'error', message: 'You must be logged in to create an agreement.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    // MobilePay requires HTTPS URLs - use VITE_APP_URL if set (production domain),
    // otherwise fall back to window.location.origin (works automatically in production/HTTPS)
    const appBaseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const merchantRedirectUrl = `${appBaseUrl}/mobilepay-callback`;
    const merchantAgreementUrl = `${appBaseUrl}/user/subscriptions`;

    console.log(`MobilePay Debug - Sending Redirect URL: ${merchantRedirectUrl}`);
    console.log(`MobilePay Debug - Sending Agreement URL: ${merchantAgreementUrl}`);
    console.log(`MobilePay Debug - appBaseUrl: ${appBaseUrl}`);

    const payload = {
      customer: {
        phoneNumber: phoneNumber,
      },
      amount: 9999, // 99.99 DKK in minor units (øre)
      currency: 'DKK' as SupportedCurrency,
      description: 'Monthly Subscription',
      merchantRedirectUrl,
      merchantAgreementUrl,
    };

    try {
      const result = await mobilepayService.createRecurringPaymentAgreement(payload);

      if (result.success && (result.data?.vippsConfirmationUrl || result.data?.redirectUrl)) {
        const redirectUrl = result.data.vippsConfirmationUrl || result.data.redirectUrl;
        setFeedback({ type: 'success', message: 'Redirecting to MobilePay...' });
        // Redirect the user to the MobilePay approval page
        window.location.href = redirectUrl;
      } else {
        throw new Error(result.error || 'Failed to get redirect URI from MobilePay.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Full error:', error);
      setFeedback({ type: 'error', message: `Failed to create agreement: ${errorMessage}` });
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mt-6">
      <h2 className="text-2xl font-semibold mb-4">MobilePay Recurring Payments</h2>
      <div className="border-t pt-4">
        <p className="mb-4 text-gray-600">
          Enter your phone number and click the button to set up a recurring payment agreement with MobilePay.
        </p>
        <div className="mb-4">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number (e.g., 4791234567)</label>
          <input
            type="tel"
            id="phone"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="4791234567"
          />
        </div>
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

      {/* Section for testing single payments */}
      <div className="border-t pt-4 mt-6">
        <h3 className="text-xl font-semibold mb-4">Test Single Payment</h3>
        <p className="mb-4 text-gray-600">
          Click this button to generate a one-time payment link for a test product.
        </p>
        <button
          onClick={handleCreateSinglePayment}
          disabled={isLoading}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
        >
          {isLoading ? 'Processing...' : 'Create Single Payment Link'}
        </button>
        {singlePaymentFeedback && (
          <div className={`mt-4 p-3 rounded ${singlePaymentFeedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <p>{singlePaymentFeedback.message}</p>
            {singlePaymentFeedback.type === 'success' && singlePaymentFeedback.link && (
              <a href={singlePaymentFeedback.link} target="_blank" rel="noopener noreferrer" className="font-bold underline break-all">
                {singlePaymentFeedback.link}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobilePaySettings;
