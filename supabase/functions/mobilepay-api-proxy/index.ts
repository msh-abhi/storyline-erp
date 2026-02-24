// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from '../_shared/cors.ts';

// MobilePay environment variables - required for API access
const MOBILEPAY_CLIENT_ID = Deno.env.get('MOBILEPAY_CLIENT_ID');
const MOBILEPAY_CLIENT_SECRET = Deno.env.get('MOBILEPAY_CLIENT_SECRET');
const MOBILEPAY_SUBSCRIPTION_KEY = Deno.env.get('MOBILEPAY_SUBSCRIPTION_KEY');
const MOBILEPAY_ENVIRONMENT = Deno.env.get('MOBILEPAY_ENVIRONMENT') || Deno.env.get('VITE_MOBILEPAY_ENVIRONMENT') || 'sandbox'; // 'sandbox' or 'production'
const MOBILEPAY_API_BASE_URL = MOBILEPAY_ENVIRONMENT === 'production'
  ? 'https://api.vipps.no'
  : 'https://apitest.vipps.no';
const MOBILEPAY_WEBHOOK_URL = Deno.env.get('MOBILEPAY_WEBHOOK_URL') || 'https://your-app.supabase.co/functions/v1/mobilepay-webhook';

// Get OAuth2 access token for Vipps MobilePay
async function getAccessToken(): Promise<string> {
  const tokenUrl = `${MOBILEPAY_API_BASE_URL}/accesstoken/get`;

  console.log('MobilePay Debug - OAuth Request:');
  console.log('URL:', tokenUrl);
  // Note: Not logging credential lengths for security

  const headers = {
    'Content-Type': 'application/json',
    'client_id': MOBILEPAY_CLIENT_ID,
    'client_secret': MOBILEPAY_CLIENT_SECRET,
    'Ocp-Apim-Subscription-Key': MOBILEPAY_SUBSCRIPTION_KEY,
  };

  console.log('MobilePay Debug - Request Headers:', Object.keys(headers).join(', '));

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers,
  });

  console.log('MobilePay Debug - OAuth Response:');
  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);

  if (!response.ok) {
    const errorData = await response.text();
    console.log('Error response body:', errorData);
    throw new Error(`Failed to get access token: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  console.log('Success response:', JSON.stringify(data, null, 2));
  return data.access_token;
}

const MOBILEPAY_MERCHANT_SERIAL_NUMBER = Deno.env.get('MOBILEPAY_MERCHANT_SERIAL_NUMBER');
const MOBILEPAY_RECURRING_SUBSCRIPTION_KEY = Deno.env.get('MOBILEPAY_RECURRING_SUBSCRIPTION_KEY');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('MobilePay Debug - Environment variables validation:');
    console.log('MOBILEPAY_CLIENT_ID configured:', !!MOBILEPAY_CLIENT_ID);
    console.log('MOBILEPAY_CLIENT_SECRET configured:', !!MOBILEPAY_CLIENT_SECRET);
    console.log('MOBILEPAY_SUBSCRIPTION_KEY configured:', !!MOBILEPAY_SUBSCRIPTION_KEY);
    console.log('MOBILEPAY_MERCHANT_SERIAL_NUMBER configured:', !!MOBILEPAY_MERCHANT_SERIAL_NUMBER);
    console.log('MOBILEPAY_RECURRING_SUBSCRIPTION_KEY configured:', !!MOBILEPAY_RECURRING_SUBSCRIPTION_KEY);

    if (!MOBILEPAY_CLIENT_ID || !MOBILEPAY_CLIENT_SECRET || !MOBILEPAY_SUBSCRIPTION_KEY || !MOBILEPAY_MERCHANT_SERIAL_NUMBER) {
      throw new Error(`MobilePay API credentials missing. Check environment variables: CLIENT_ID=${!!MOBILEPAY_CLIENT_ID}, CLIENT_SECRET=${!!MOBILEPAY_CLIENT_SECRET}, SUBSCRIPTION_KEY=${!!MOBILEPAY_SUBSCRIPTION_KEY}, MERCHANT_SERIAL_NUMBER=${!!MOBILEPAY_MERCHANT_SERIAL_NUMBER}`);
    }
    if (!MOBILEPAY_WEBHOOK_URL) {
      throw new Error('MOBILEPAY_WEBHOOK_URL is not set. Please configure the webhook endpoint URL.');
    }

    const { action, payload } = await req.json();
    console.log(`MobilePay Proxy: Executing ${action}`);

    let mobilePayResponse;

    // Get access token for all API calls
    const accessToken = await getAccessToken();

    const ePaymentHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Ocp-Apim-Subscription-Key': MOBILEPAY_SUBSCRIPTION_KEY,
      'Merchant-Serial-Number': MOBILEPAY_MERCHANT_SERIAL_NUMBER,
      'Vipps-System-Name': 'storyline-erp',
      'Vipps-System-Version': '1.0.0',
    };

    const recurringHeaders = {
      ...ePaymentHeaders,
      'Ocp-Apim-Subscription-Key': MOBILEPAY_RECURRING_SUBSCRIPTION_KEY || MOBILEPAY_SUBSCRIPTION_KEY,
    };

    console.log(`Using subscription key for action '${action}': ${recurringHeaders['Ocp-Apim-Subscription-Key'] === MOBILEPAY_RECURRING_SUBSCRIPTION_KEY ? 'Recurring' : 'Default'}`);


    switch (action) {
      case 'createPaymentLink': {
        const { externalId, amount, currency, description, saleId } = payload;
        console.log('Creating payment link for sale:', { externalId, amount, currency, saleId });

        const referenceRegex = /^[a-zA-Z0-9-]{8,64}$/;
        if (!referenceRegex.test(externalId)) {
          throw new Error(`Invalid reference format: '${externalId}'. Must be 8-64 alphanumeric characters or hyphens.`);
        }

        mobilePayResponse = await fetch(`${MOBILEPAY_API_BASE_URL}/epayment/v1/payments`, {
          method: 'POST',
          headers: {
            ...ePaymentHeaders,
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({
            amount: {
              value: amount, // Amount is now expected in minor units (e.g., øre)
              currency: currency,
            },
            reference: externalId,
            description: description || `Payment for Sale #${externalId}`,
            returnUrl: MOBILEPAY_WEBHOOK_URL,
            userFlow: 'WEB_REDIRECT',
            paymentMethod: { type: 'WALLET' }
          }),
        });

        if (mobilePayResponse.ok) {
          const paymentData = await mobilePayResponse.json();
          console.log('Payment created successfully:', paymentData);
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                paymentId: paymentData.id,
                paymentLink: paymentData.redirectUrl || paymentData.paymentLink,
                externalId: externalId,
                saleId: saleId
              }
            }),
            { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 200 }
          );
        }
        break;
      }
      case 'createRecurringPaymentAgreement': {
        const { customer, amount, currency, description, merchantRedirectUrl, merchantAgreementUrl } = payload;
        console.log(`MobilePay Debug - Action: createRecurringPaymentAgreement (v3)`);
        console.log(`MobilePay Debug - Environment: ${MOBILEPAY_ENVIRONMENT}`);
        console.log(`MobilePay Debug - URL: ${MOBILEPAY_API_BASE_URL}/recurring/v3/agreements`);
        console.log(`MobilePay Debug - Phone: ${customer?.phoneNumber}`);

        // v3 API: phoneNumber is a top-level field (not nested in customer)
        mobilePayResponse = await fetch(`${MOBILEPAY_API_BASE_URL}/recurring/v3/agreements`, {
          method: 'POST',
          headers: {
            ...recurringHeaders,
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({
            phoneNumber: customer.phoneNumber, // v3: top-level, not nested
            merchantAgreementUrl: merchantAgreementUrl,
            merchantRedirectUrl: merchantRedirectUrl,
            pricing: {
              type: 'LEGACY',
              amount: amount,
              currency: currency,
            },
            interval: {
              unit: 'MONTH',
              count: 1,
            },
            productName: description,
            initialCharge: {
              amount: amount,
              description: `Initial charge for ${description}`,
              transactionType: 'RESERVE_CAPTURE',
            },
          }),
        });
        break;
      }
      case 'createCharge': {
        const { agreementId, amount, currency, description, externalId } = payload;
        console.log(`Creating v3 charge for agreement ${agreementId}: ${amount} ${currency}`);

        mobilePayResponse = await fetch(`${MOBILEPAY_API_BASE_URL}/recurring/v3/agreements/${agreementId}/charges`, {
          method: 'POST',
          headers: {
            ...recurringHeaders,
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({
            amount: amount,
            currency: currency,
            description: description,
            due: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            externalId: externalId || crypto.randomUUID(),
          }),
        });
        break;
      }
      case 'getAgreement': {
        const { agreementId } = payload;
        mobilePayResponse = await fetch(`${MOBILEPAY_API_BASE_URL}/recurring/v3/agreements/${agreementId}`, {
          method: 'GET',
          headers: recurringHeaders,
        });
        break;
      }
      case 'capturePayment': {
        const { paymentId, amount, currency } = payload;
        mobilePayResponse = await fetch(`${MOBILEPAY_API_BASE_URL}/epayment/v1/payments/${paymentId}/capture`, {
          method: 'POST',
          headers: {
            ...ePaymentHeaders,
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({
            modificationAmount: {
              value: amount, // Amount is now expected in minor units
              currency: currency,
            }
          }),
        });
        break;
      }
      case 'cancelAgreement': {
        const { agreementId } = payload;
        mobilePayResponse = await fetch(`${MOBILEPAY_API_BASE_URL}/recurring/v3/agreements/${agreementId}`, {
          method: 'PATCH',
          headers: {
            ...recurringHeaders,
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({
            status: 'STOPPED'
          }),
        });
        break;
      }
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
    console.error('MobilePay API proxy error:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      }
    );
  }
});
