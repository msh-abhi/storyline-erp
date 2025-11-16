// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// MobilePay environment variables
const MOBILEPAY_CLIENT_ID = Deno.env.get('MOBILEPAY_CLIENT_ID');
const MOBILEPAY_CLIENT_SECRET = Deno.env.get('MOBILEPAY_CLIENT_SECRET');
const MOBILEPAY_WEBHOOK_SECRET = Deno.env.get('MOBILEPAY_WEBHOOK_SECRET'); // Used for webhook signature verification

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- Webhook Signature Verification (Recommended for production) ---
    // MobilePay webhooks can be secured using a shared secret.
    // You would typically calculate a hash of the payload using the secret
    // and compare it with a header like 'X-MobilePay-Signature'.
    // For simplicity, this example skips verification, but it's crucial for security.
    // if (!MOBILEPAY_WEBHOOK_SECRET) {
    //   console.warn('MOBILEPAY_WEBHOOK_SECRET is not set. Webhook signature verification is skipped.');
    // }
    // const signature = req.headers.get('X-MobilePay-Signature');
    // if (signature && MOBILEPAY_WEBHOOK_SECRET) {
    //   // Implement signature verification logic here
    //   // e.g., using crypto.subtle.verify or a similar library
    // }
    // --- End of Webhook Signature Verification ---

    const payload = await req.json();
    console.log('MobilePay Webhook received:', JSON.stringify(payload, null, 2));

    const eventType = payload.eventType; // e.g., "Payment.Reserved", "Payment.Captured", "Payment.Cancelled"
    const paymentId = payload.paymentId; // MobilePay's unique payment ID
    const agreementId = payload.agreementId; // For recurring payments
    const orderId = payload.orderId; // Your internal order ID, if passed to MobilePay

    // Find the invoice and subscription based on the paymentId or agreementId
    let invoiceId: string | null = null;
    let subscriptionId: string | null = null;
    let customerId: string | null = null;
    let saleId: string | null = null;

    // Try to find by externalPaymentId (which could be paymentId or agreementId)
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, customer_id, subscription_id')
      .or(`external_payment_id.eq.${paymentId},external_payment_id.eq.${agreementId}`)
      .maybeSingle();

    if (invoiceError) {
      console.error('Error fetching invoice:', invoiceError);
      throw invoiceError;
    }

    if (invoiceData) {
      invoiceId = invoiceData.id;
      customerId = invoiceData.customer_id;
      subscriptionId = invoiceData.subscription_id;
    }

    // Try to find the sale record by payment reference or externalId
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .select('id, payment_status, status, buyer_id')
      .eq('id', orderId || payload.reference)
      .maybeSingle();

    if (saleError) {
      console.error('Error fetching sale:', saleError);
    }

    if (saleData) {
      saleId = saleData.id;
    } else {
      console.warn(`Sale not found for orderId: ${orderId} or reference: ${payload.reference}`);
      // If no invoice found, we might still want to log the transaction
    }

    let transactionStatus: 'pending' | 'paid' | 'failed' | 'refunded' = 'pending';
    let invoiceStatus: 'pending' | 'paid' | 'cancelled' | 'refunded' = 'pending';
    let subscriptionStatus: 'active' | 'expired' | 'cancelled' | 'renewed' = 'active'; // Default to active for successful payments

    switch (eventType) {
      case 'Payment.Reserved':
        transactionStatus = 'pending'; // Payment authorized, but not captured
        invoiceStatus = 'pending';
        break;
      case 'Payment.Captured':
        transactionStatus = 'paid';
        invoiceStatus = 'paid';
        subscriptionStatus = 'active'; // Mark subscription as active
        break;
      case 'Payment.Cancelled':
      case 'Payment.Rejected':
        transactionStatus = 'failed';
        invoiceStatus = 'cancelled';
        subscriptionStatus = 'cancelled';
        break;
      case 'Payment.Refunded':
        transactionStatus = 'refunded';
        invoiceStatus = 'refunded';
        subscriptionStatus = 'cancelled'; // Or adjust based on partial refund logic
        break;
      case 'Agreement.Created':
        // Recurring agreement created, initial payment might be separate
        console.log(`MobilePay Agreement Created: ${agreementId}`);
        // No change to invoice/transaction status yet, but update subscription
        if (subscriptionId) {
          await supabase
            .from('subscriptions')
            .update({ mobilepay_agreement_id: agreementId, payment_method: 'mobilepay' })
            .eq('id', subscriptionId);
        }
        break;
      case 'Agreement.PaymentCaptured':
        transactionStatus = 'paid';
        invoiceStatus = 'paid';
        subscriptionStatus = 'active'; // Ensure subscription is active
        // For recurring payments, you might need to create a new invoice for each payment
        // Or update an existing one if it's a single invoice for the agreement
        break;
      case 'Agreement.Cancelled':
        subscriptionStatus = 'cancelled';
        // Update subscription status
        if (subscriptionId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'cancelled' })
            .eq('id', subscriptionId);
        }
        break;
      default:
        console.warn(`Unhandled MobilePay event type: ${eventType}`);
        break;
    }

    // Record the payment transaction
    const { data: newTransaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        invoice_id: invoiceId,
        customer_id: customerId,
        payment_method: 'mobilepay',
        amount: payload.amount / 100, // MobilePay amounts are in øre/cents
        currency: payload.currency || 'DKK',
        status: transactionStatus,
        transaction_id: paymentId,
        provider_response: payload,
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error inserting payment transaction:', transactionError);
      // Decide if you want to throw or just log and continue
    }

    // Update the invoice status if an invoice was found
    if (invoiceId && invoiceStatus !== 'pending') {
      await supabase
        .from('invoices')
        .update({ status: invoiceStatus })
        .eq('id', invoiceId);
    }

    // Update the sale record if sale was found and payment was successful
    if (saleId && transactionStatus === 'paid') {
      console.log(`Updating sale ${saleId} status to completed due to successful payment`);
      
      await supabase
        .from('sales')
        .update({
          status: 'completed',
          payment_status: 'received',
          updated_at: new Date().toISOString()
        })
        .eq('id', saleId);
    }

    // Update the subscription status if a subscription was found and payment was captured
    if (subscriptionId && (eventType === 'Payment.Captured' || eventType === 'Agreement.PaymentCaptured')) {
      await supabase
        .from('subscriptions')
        .update({ status: subscriptionStatus })
        .eq('id', subscriptionId);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'MobilePay webhook processed' }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      }
    );
  } catch (error) {
    console.error('MobilePay webhook processing error:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      }
    );
  }
});
