import { supabase } from '../lib/supabase';
import { SupportedCurrency } from '../types';

interface CreateRecurringPaymentAgreementPayload {
  customer: {
    phoneNumber: string; // E.g., "4712345678"
  };
  amount: number; // Amount in minor units (e.g., øre, cents)
  currency: SupportedCurrency;
  description: string;
  merchantRedirectUrl: string; // URL to redirect user to after they approve/reject the agreement
  merchantAgreementUrl: string; // URL on your site where user can see/manage their agreement
}

interface CapturePaymentPayload {
  paymentId: string;
  amount: number; // Amount in minor units (e.g., øre, cents)
  currency: SupportedCurrency;
}

interface CancelAgreementPayload {
  agreementId: string;
}

export const mobilepayService = {
  async createPaymentLink(payload: {
    externalId: string;
    amount: number; // Amount in minor units (e.g., øre, cents)
    currency: SupportedCurrency;
    description?: string;
    customerEmail?: string;
    customerName?: string;
    saleId: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Generate a new externalId that is compliant with MobilePay's format requirements
      // Format: 8-64 characters, alphanumeric and hyphens.
      const compliantExternalId = `sale-${payload.saleId.replace(/[^a-zA-Z0-9-]/g, '')}-${Date.now().toString(36)}`;

      const newPayload = {
        ...payload,
        externalId: compliantExternalId.slice(0, 63), // Ensure it's within the 64-char limit
      };

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mobilepay-api-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createPaymentLink',
          payload: newPayload,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create MobilePay payment link');
      }
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error creating MobilePay payment link:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async createRecurringPaymentAgreement(payload: {
    customer: { phoneNumber: string };
    amount: number;
    currency: SupportedCurrency;
    description: string;
    merchantRedirectUrl: string;
    merchantAgreementUrl: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Convert amount to minor units (cents/øre) if it's not already
      const amountInMinorUnits = Math.round(payload.amount * 100);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mobilepay-api-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createRecurringPaymentAgreement',
          payload: {
            ...payload,
            amount: amountInMinorUnits,
          },
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

  async createCharge(payload: {
    agreementId: string;
    amount: number;
    currency: SupportedCurrency;
    description: string;
    externalId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const amountInMinorUnits = Math.round(payload.amount * 100);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mobilepay-api-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createCharge',
          payload: {
            ...payload,
            amount: amountInMinorUnits,
          },
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create MobilePay charge');
      }
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error creating MobilePay charge:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async getAgreement(agreementId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mobilepay-api-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getAgreement',
          payload: { agreementId },
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to get MobilePay agreement details');
      }
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error getting MobilePay agreement:', error);
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
          payload: {
            ...payload,
            amount: Math.round(payload.amount * 100), // Ensure minor units
          },
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
