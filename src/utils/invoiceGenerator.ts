import { Invoice, Subscription, SupportedCurrency } from '../types';
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
  paymentMethod: 'mobilepay' | 'revolut' | 'manual' | 'cash' | 'paypal';
  subscription?: Subscription;
  metadata?: Record<string, any>;
}

export async function generateInvoice(options: GenerateInvoiceOptions): Promise<{ success: boolean; invoice?: Invoice; paymentLink?: string; error?: string }> {
  const { customerId, customerName, customerEmail, amount, currency, dueDate, paymentMethod, subscription, metadata } = options;

  let currentPaymentMethod: 'mobilepay' | 'revolut' | 'manual' = (paymentMethod === 'cash' || paymentMethod === 'paypal') ? 'manual' : paymentMethod as 'mobilepay' | 'revolut' | 'manual';
  let externalPaymentId: string | undefined; // For MobilePay agreement ID or Revolut payment ID
  let paymentLink: string | undefined;

  try {
    if (paymentMethod === 'mobilepay') {
      if (subscription) {
        // For subscriptions, create a recurring payment agreement
        const redirectUri = `${window.location.origin}/subscriptions?status=mobilepay_return&subscriptionId=${subscription.id}`;
        const agreementUri = `${window.location.origin}/profile/subscriptions`;
        const customerPhone = metadata?.phone || '';

        const mobilePayResult = await mobilepayService.createRecurringPaymentAgreement({
          customer: {
            phoneNumber: customerPhone || '4500000000',
          },
          amount: amount,
          currency: currency,
          description: `Subscription for ${subscription.productName}`,
          merchantRedirectUrl: redirectUri,
          merchantAgreementUrl: agreementUri,
        });

        if (!mobilePayResult.success || !mobilePayResult.data?.vippsConfirmationUrl) {
          throw new Error(mobilePayResult.error || 'Failed to get MobilePay confirmation URL');
        }
        paymentLink = mobilePayResult.data.vippsConfirmationUrl;
        externalPaymentId = mobilePayResult.data.agreementId;
      } else {
        // For one-time sales, create a single payment link
        const mobilePayResult = await mobilepayService.createPaymentLink({
          externalId: metadata?.saleId || `inv-${Date.now()}`,
          amount: amount,
          currency: currency,
          description: metadata?.productName ? `Payment for ${metadata.productName}` : `Payment for Invoice`,
          customerEmail: customerEmail,
          customerName: customerName,
          saleId: metadata?.saleId || '',
        });

        if (!mobilePayResult.success || !mobilePayResult.data?.paymentLink) {
          throw new Error(mobilePayResult.error || 'Failed to create MobilePay payment link');
        }
        paymentLink = mobilePayResult.data.paymentLink;
        externalPaymentId = mobilePayResult.data.paymentId;
      }
    } else if (paymentMethod === 'revolut') {
      try {
        // For Revolut, create a payment request
        const revolutResult = await revolutService.createPaymentRequest({
          amount: amount,
          currency: currency,
          reference: `Invoice for ${customerName} - ${subscription?.productName || 'Service'}`,
        });

        if (revolutResult.success && revolutResult.data?.public_url) {
          paymentLink = revolutResult.data.public_url;
          externalPaymentId = revolutResult.data.id; // Revolut payment request ID
        } else {
          // If Revolut is not configured, we will allow it to fail silently and proceed with a manual invoice.
          console.warn('Revolut payment link creation failed, proceeding with manual invoice. Error:', revolutResult.error);
          currentPaymentMethod = 'manual';
        }
      } catch (error) {
        console.warn('Revolut service is not available, proceeding with manual invoice. Error:', error);
        currentPaymentMethod = 'manual';
      }
    }

    const newInvoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = {
      customerId: customerId,
      subscriptionId: subscription?.id,
      amount: amount,
      currency: currency,
      status: 'pending',
      dueDate: dueDate,
      issuedDate: new Date().toISOString(),
      paymentMethod: currentPaymentMethod,
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
