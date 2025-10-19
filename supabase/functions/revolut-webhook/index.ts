import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Revolut environment variables
const REVOLUT_WEBHOOK_SECRET = Deno.env.get('REVOLUT_WEBHOOK_SECRET'); // For verifying webhook signatures

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- Webhook Signature Verification (CRUCIAL for production) ---
    // You must configure a webhook secret in your Revolut developer settings
    // and verify the signature of incoming requests.
    // This is a simplified example and skips actual verification for now.
    const signature = req.headers.get('Revolut-Signature');
    if (!REVOLUT_WEBHOOK_SECRET) {
      console.warn('REVOLUT_WEBHOOK_SECRET is not set. Signature verification is skipped.');
    } else if (!signature) {
      // In production, you should probably throw an error here
      console.warn('Missing Revolut-Signature header. Verification skipped.');
    } else {
      // Implement your signature verification logic here
      // const body = await req.text(); // Need to read body as text for verification
      // const isValid = verifyRevolutSignature(body, signature, REVOLUT_WEBHOOK_SECRET);
      // if (!isValid) {
      //   throw new Error('Invalid webhook signature');
      // }
      // const payload = JSON.parse(body);
    }
    // --- End of Verification ---

    const payload = await req.json();
    console.log('Revolut Webhook received:', JSON.stringify(payload, null, 2));

    const event = payload.event; // e.g., 'ORDER_COMPLETED', 'ORDER_AUTHORISED'
    const orderId = payload.data?.id; // Revolut Order ID
    const internalReference = payload.data?.merchant_order_ext_ref; // Your internal reference

    if (!event || !orderId || !internalReference) {
      throw new Error('Invalid webhook payload. Missing event, orderId, or merchant_order_ext_ref.');
    }

    // Find the invoice based on the internal reference (merchant_order_ext_ref)
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, customer_id, subscription_id')
      .eq('external_payment_id', internalReference)
      .maybeSingle();

    if (invoiceError) {
      console.error('Error fetching invoice by external_payment_id:', invoiceError);
      throw invoiceError;
    }

    if (!invoiceData) {
      console.warn(`Invoice not found for internal reference: ${internalReference}`);
      // Depending on your logic, you might want to stop here or still record the transaction
      return new Response(JSON.stringify({ success: true, message: 'Webhook received, but no matching invoice found.' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      });
    }

    const { id: invoiceId, customer_id: customerId } = invoiceData;
    let transactionStatus: 'pending' | 'paid' | 'failed' | 'refunded' = 'pending';
    let invoiceStatus: 'pending' | 'paid' | 'cancelled' | 'refunded' = 'pending';

    switch (event) {
      case 'ORDER_COMPLETED':
        transactionStatus = 'paid';
        invoiceStatus = 'paid';
        break;
      case 'ORDER_AUTHORISED': // This might be considered pending until captured
        transactionStatus = 'pending';
        invoiceStatus = 'pending';
        break;
      case 'ORDER_FAILED':
      case 'ORDER_CANCELLED':
        transactionStatus = 'failed';
        invoiceStatus = 'cancelled';
        break;
      // Note: Revolut has more events, like for refunds. Add them as needed.
      default:
        console.warn(`Unhandled Revolut event type: ${event}`);
        break;
    }

    // Record the payment transaction
    const { error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        invoice_id: invoiceId,
        customer_id: customerId,
        payment_method: 'revolut',
        amount: payload.data.order_amount.value, // Amount from the webhook
        currency: payload.data.order_amount.currency,
        status: transactionStatus,
        transaction_id: orderId, // Revolut's order ID
        provider_response: payload,
      });

    if (transactionError) {
      console.error('Error inserting Revolut payment transaction:', transactionError);
      // Decide if you want to throw or just log and continue
    }

    // Update the invoice status if it has changed
    if (invoiceId && invoiceStatus !== 'pending') {
      await supabase
        .from('invoices')
        .update({ status: invoiceStatus })
        .eq('id', invoiceId);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Revolut webhook processed' }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Revolut webhook processing error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      }
    );
  }
});
