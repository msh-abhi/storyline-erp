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
async function getAccessToken(subscriptionKey: string): Promise<string> {
  const tokenUrl = `${MOBILEPAY_API_BASE_URL}/accesstoken/get`;

  console.log('MobilePay Debug - OAuth Request:');
  console.log('URL:', tokenUrl);

  const headers = {
    'Content-Type': 'application/json',
    'client_id': MOBILEPAY_CLIENT_ID || '',
    'client_secret': MOBILEPAY_CLIENT_SECRET || '',
    'Ocp-Apim-Subscription-Key': subscriptionKey,
  };

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('MobilePay OAuth error:', response.status, errorData);
    throw new Error(`Failed to get access token: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
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
    console.log(`MobilePay Proxy received action: ${action}`);

    let mobilePayResponse;

    // Determine which key to use based on the action
    const isRecurringAction = ['createRecurringPaymentAgreement', 'createCharge', 'getAgreement', 'cancelAgreement'].includes(action);
    const apiSubscriptionKey = isRecurringAction
      ? (MOBILEPAY_RECURRING_SUBSCRIPTION_KEY || MOBILEPAY_SUBSCRIPTION_KEY)
      : (MOBILEPAY_SUBSCRIPTION_KEY || '');

    if (!apiSubscriptionKey) {
      throw new Error(`Missing subscription key for action: ${action}`);
    }

    console.log(`Getting access token for ${isRecurringAction ? 'Recurring' : 'ePayment'} key...`);
    const accessToken = await getAccessToken(apiSubscriptionKey);

    const commonHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Ocp-Apim-Subscription-Key': apiSubscriptionKey,
      'Merchant-Serial-Number': MOBILEPAY_MERCHANT_SERIAL_NUMBER || '',
      'Vipps-System-Name': 'storyline-erp',
      'Vipps-System-Version': '1.0.0',
    };


    switch (action) {
      case 'createPaymentLink': {
        const { externalId, amount, currency, description, saleId, returnUrl: customReturnUrl } = payload;
        const returnUrl = customReturnUrl || MOBILEPAY_WEBHOOK_URL; // Default fallback

        console.log('Creating ePayment link for:', { externalId, amount, currency, saleId, returnUrl });

        mobilePayResponse = await fetch(`${MOBILEPAY_API_BASE_URL}/epayment/v1/payments`, {
          method: 'POST',
          headers: {
            ...commonHeaders,
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({
            amount: { value: amount, currency },
            reference: externalId,
            description: description || `Payment for Sale #${externalId}`,
            returnUrl: returnUrl,
            userFlow: 'WEB_REDIRECT',
            paymentMethod: { type: 'WALLET' }
          }),
        });
        break;
      }
      case 'createRecurringPaymentAgreement': {
        const { customer, amount, currency, description, merchantRedirectUrl, merchantAgreementUrl } = payload;
        console.log(`Creating Recurring Agreement (v3) for: ${customer?.phoneNumber}`);

        mobilePayResponse = await fetch(`${MOBILEPAY_API_BASE_URL}/recurring/v3/agreements`, {
          method: 'POST',
          headers: {
            ...commonHeaders,
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({
            phoneNumber: customer.phoneNumber,
            merchantAgreementUrl: merchantAgreementUrl,
            merchantRedirectUrl: merchantRedirectUrl,
            pricing: { type: 'LEGACY', amount: amount, currency: currency },
            interval: { unit: 'MONTH', count: 1 },
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
        mobilePayResponse = await fetch(`${MOBILEPAY_API_BASE_URL}/recurring/v3/agreements/${agreementId}/charges`, {
          method: 'POST',
          headers: {
            ...commonHeaders,
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({
            amount, currency, description,
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
          headers: commonHeaders,
        });
        break;
      }
      case 'capturePayment': {
        const { paymentId, amount, currency } = payload;
        mobilePayResponse = await fetch(`${MOBILEPAY_API_BASE_URL}/epayment/v1/payments/${paymentId}/capture`, {
          method: 'POST',
          headers: {
            ...commonHeaders,
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({
            modificationAmount: { value: amount, currency }
          }),
        });
        break;
      }
      case 'cancelAgreement': {
        const { agreementId } = payload;
        mobilePayResponse = await fetch(`${MOBILEPAY_API_BASE_URL}/recurring/v3/agreements/${agreementId}`, {
          method: 'PATCH',
          headers: {
            ...commonHeaders,
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({ status: 'STOPPED' }),
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

    // Mapping for frontend consistency
    let finalData = responseData;
    if (action === 'createPaymentLink') {
      finalData = {
        paymentId: responseData.id,
        paymentLink: responseData.redirectUrl || responseData.paymentLink,
        status: responseData.status,
        ...responseData
      };
    } else if (action === 'createRecurringPaymentAgreement') {
      finalData = {
        agreementId: responseData.agreementId,
        vippsConfirmationUrl: responseData.vippsConfirmationUrl,
        ...responseData
      };
    }

    return new Response(
      JSON.stringify({ success: true, data: finalData }),
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
