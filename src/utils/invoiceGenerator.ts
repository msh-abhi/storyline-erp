import { Invoice, Subscription, Customer, SupportedCurrency } from '../types';
import { invoiceService } from '../services/supabaseService';
import { mobilepayService } from '../services/mobilepayService';
import { revolutService } from '../services/revolutService';

interface GenerateInvoiceOptions {
  customerId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: SupportedCurrency;
  dueDate: string;
  paymentMethod: 'mobilepay' | 'revolut' | 'manual';
  subscription?: Subscription;
  metadata?: Record<string, any>;
}

export async function generateInvoice(options: GenerateInvoiceOptions): Promise<{ success: boolean; invoice?: Invoice; paymentLink?: string; error?: string }> {
  const { customerId, customerName, customerEmail, amount, currency, dueDate, paymentMethod, subscription, metadata } = options;

  let paymentLink: string | undefined;
  let externalPaymentId: string | undefined; // For MobilePay agreement ID or Revolut payment ID

  try {
    if (paymentMethod === 'mobilepay') {
      // For MobilePay, we need to create a recurring payment agreement
      // The redirectUri should point back to your app after MobilePay flow
      const redirectUri = `${window.location.origin}/subscriptions?status=mobilepay_return&invoiceId=${subscription?.id || 'new'}`; // Example redirect
      
      const mobilePayResult = await mobilepayService.createRecurringPaymentAgreement({
        externalId: subscription?.id || `invoice-${Date.now()}`, // Unique ID for MobilePay
        customerId: customerId,
        subscriptionId: subscription?.id || '',
        amount: amount,
        currency: currency,
        redirectUri: redirectUri,
      });

      if (!mobilePayResult.success || !mobilePayResult.data?.paymentUrl) {
        throw new Error(mobilePayResult.error || 'Failed to get MobilePay payment URL');
      }
      paymentLink = mobilePayResult.data.paymentUrl;
      externalPaymentId = mobilePayResult.data.agreementId; // MobilePay agreement ID
    } else if (paymentMethod === 'revolut') {
      // For Revolut, create a payment request
      const revolutResult = await revolutService.createPaymentRequest({
        amount: amount,
        currency: currency,
        reference: `Invoice for ${customerName} - ${subscription?.productName || 'Service'}`,
        recipientEmail: customerEmail,
        recipientName: customerName,
      });

      if (!revolutResult.success || !revolutResult.data?.public_url) {
        throw new Error(revolutResult.error || 'Failed to get Revolut payment link');
      }
      paymentLink = revolutResult.data.public_url;
      externalPaymentId = revolutResult.data.id; // Revolut payment request ID
    }

    const newInvoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = {
      customerId: customerId,
      subscriptionId: subscription?.id,
      amount: amount,
      currency: currency,
      status: 'pending',
      dueDate: dueDate,
      issuedDate: new Date().toISOString(),
      paymentMethod: paymentMethod,
      paymentLink: paymentLink,
      externalPaymentId: externalPaymentId,
      metadata: {
        customerName,
        customerEmail,
        ...(metadata || {}),
      },
    };

    const createdInvoice = await invoiceService.create(newInvoice);

    // If it's a subscription, update the subscription with the invoice ID and payment method
    if (subscription && createdInvoice) {
      await invoiceService.update(createdInvoice.id, { subscriptionId: subscription.id });
      // You might also want to update the subscription itself with the invoice ID and payment method
      // This would require an updateSubscription action in AppContext
    }

    return { success: true, invoice: createdInvoice, paymentLink: paymentLink };
  } catch (error) {
    console.error('Error generating invoice:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
