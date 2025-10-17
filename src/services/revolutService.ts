import { supabase } from '../lib/supabase';
import { SupportedCurrency } from '../types';

interface CreatePaymentRequestPayload {
  amount: number;
  currency: SupportedCurrency;
  reference: string; // Your internal reference for the payment
  recipientEmail?: string;
  recipientName?: string;
  // Add other Revolut payment request fields as needed
}

interface GetPaymentStatusPayload {
  paymentRequestId: string; // Revolut's payment request ID
}

export const revolutService = {
  async createPaymentRequest(payload: CreatePaymentRequestPayload): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/revolut-api-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createPaymentRequest', // This action needs to be handled by the proxy
          payload: payload,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create Revolut payment request');
      }
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error creating Revolut payment request:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async getPaymentStatus(paymentRequestId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/revolut-api-proxy?action=getPaymentStatus&paymentRequestId=${paymentRequestId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to get Revolut payment status');
      }
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error getting Revolut payment status:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Add other Revolut related functions here
};
