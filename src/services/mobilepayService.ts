import { supabase } from '../lib/supabase';
import { SupportedCurrency } from '../types';

interface CreateRecurringPaymentAgreementPayload {
  externalId: string; // Your unique ID for this agreement
  customerId: string;
  subscriptionId: string;
  amount: number; // Total amount for the agreement
  currency: SupportedCurrency;
  redirectUri: string; // URL to redirect user after MobilePay interaction
}

interface CapturePaymentPayload {
  paymentId: string;
  amount: number;
  currency: SupportedCurrency;
}

interface CancelAgreementPayload {
  agreementId: string;
}

export const mobilepayService = {
  async createRecurringPaymentAgreement(payload: CreateRecurringPaymentAgreementPayload): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mobilepay-api-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createRecurringPaymentAgreement',
          payload: payload,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create MobilePay recurring payment agreement');
      }
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error creating MobilePay recurring payment agreement:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async capturePayment(payload: CapturePaymentPayload): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mobilepay-api-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'capturePayment',
          payload: payload,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to capture MobilePay payment');
      }
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error capturing MobilePay payment:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async cancelAgreement(payload: CancelAgreementPayload): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mobilepay-api-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancelAgreement',
          payload: payload,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to cancel MobilePay agreement');
      }
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error canceling MobilePay agreement:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Add other MobilePay related functions here
};
