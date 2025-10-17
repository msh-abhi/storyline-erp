import { corsHeaders } from '../_shared/cors.ts';

const MOBILEPAY_CLIENT_ID = Deno.env.get('MOBILEPAY_CLIENT_ID');
const MOBILEPAY_CLIENT_SECRET = Deno.env.get('MOBILEPAY_CLIENT_SECRET');
const MOBILEPAY_API_BASE_URL = 'https://api.mobilepay.dk/v1'; // Use sandbox URL for testing
const MOBILEPAY_WEBHOOK_URL = Deno.env.get('MOBILEPAY_WEBHOOK_URL'); // URL of your mobilepay-webhook function

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (!MOBILEPAY_CLIENT_ID || !MOBILEPAY_CLIENT_SECRET) {
      throw new Error('MobilePay API credentials are not set in environment variables.');
    }
    if (!MOBILEPAY_WEBHOOK_URL) {
      throw new Error('MOBILEPAY_WEBHOOK_URL is not set in environment variables.');
    }

    const { action, payload } = await req.json();

    let mobilePayResponse;

    switch (action) {
      case 'createRecurringPaymentAgreement': {
        // Payload should contain: { externalId, customerId, subscriptionId, amount, currency, redirectUri }
        const { externalId, customerId, subscriptionId, amount, currency, redirectUri } = payload;

        // MobilePay API call to create a recurring payment agreement
        // This is a simplified example. Real implementation might require more fields.
        mobilePayResponse = await fetch(`${MOBILEPAY_API_BASE_URL}/agreements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Client-Id': MOBILEPAY_CLIENT_ID,
            'X-Client-Secret': MOBILEPAY_CLIENT_SECRET,
          },
          body: JSON.stringify({
            externalId: externalId, // Your unique ID for this agreement
            amount: Math.round(amount * 100), // Amount in øre/cents
            currency: currency,
            description: `Subscription for ${subscriptionId}`,
            redirectUri: redirectUri, // URL to redirect user after MobilePay interaction
            webhookUri: MOBILEPAY_WEBHOOK_URL, // Your webhook URL for status updates
            // Add other necessary fields like customer details if MobilePay supports it
          }),
        });
        break;
      }
      case 'capturePayment': {
        // Payload should contain: { paymentId, amount, currency }
        const { paymentId, amount, currency } = payload;
        mobilePayResponse = await fetch(`${MOBILEPAY_API_BASE_URL}/payments/${paymentId}/capture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Client-Id': MOBILEPAY_CLIENT_ID,
            'X-Client-Secret': MOBILEPAY_CLIENT_SECRET,
          },
          body: JSON.stringify({
            amount: Math.round(amount * 100), // Amount in øre/cents
            currency: currency,
          }),
        });
        break;
      }
      case 'cancelAgreement': {
        // Payload should contain: { agreementId }
        const { agreementId } = payload;
        mobilePayResponse = await fetch(`${MOBILEPAY_API_BASE_URL}/agreements/${agreementId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Client-Id': MOBILEPAY_CLIENT_ID,
            'X-Client-Secret': MOBILEPAY_CLIENT_SECRET,
          },
        });
        break;
      }
      // Add other MobilePay API actions as needed (e.g., get agreement status)
      default:
        throw new Error(`Unsupported MobilePay API action: ${action}`);
    }

    if (!mobilePayResponse.ok) {
      const errorData = await mobilePayResponse.text();
      throw new Error(`MobilePay API error: ${mobilePayResponse.status} - ${errorData}`);
    }

    const responseData = await mobilePayResponse.json();

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200,
      }
    );

  } catch (error) {
    console.error('MobilePay API proxy error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      }
    );
  }
});
