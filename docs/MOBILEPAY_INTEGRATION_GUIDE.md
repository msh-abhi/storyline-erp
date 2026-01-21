# MobilePay Integration Guide

This document explains the complete MobilePay integration in the StoryLine ERP system, which handles automatic payment link generation, email notifications, and real-time payment confirmations via webhooks.

## Overview

The MobilePay integration provides a seamless payment experience where:

1. **Sales Creation**: When creating a new sale with MobilePay as the payment method, the system automatically generates a payment link
2. **Email Notification**: The payment link is automatically sent to the customer's email address
3. **Payment Processing**: Customer pays through MobilePay using the link
4. **Webhook Confirmation**: MobilePay sends webhook notifications when payment is completed
5. **Automatic Updates**: Sale status is automatically updated from 'pending' to 'completed'
6. **Real-time Metrics**: Revenue and profit calculations are updated automatically

## Architecture

### Components

1. **MobilePay Service** (`src/services/mobilepayService.ts`)
   - Handles API communication with MobilePay
   - Creates payment links
   - Manages authentication tokens

2. **MobilePay API Proxy** (`supabase/functions/mobilepay-api-proxy/index.ts`)
   - Supabase Edge Function that proxies requests to MobilePay
   - Handles OAuth2 authentication
   - Creates payment links for sales

3. **MobilePay Webhook** (`supabase/functions/mobilepay-webhook/index.ts`)
   - Receives payment confirmations from MobilePay
   - Updates sale records automatically
   - Handles various payment events

4. **Sales Management** (`src/components/SalesManagement.tsx`)
   - Integrated with MobilePay workflow
   - Automatically generates payment links
   - Sends payment links via email

### Database Tables

- **sales**: Contains sale records with payment status
- **invoices**: Invoice records linked to sales
- **payment_transactions**: Transaction logs for audit

## API Credentials

The integration requires these MobilePay credentials to be configured as environment variables in your Supabase Edge Functions:

- `MOBILEPAY_CLIENT_ID`: Your Vipps MobilePay client ID
- `MOBILEPAY_CLIENT_SECRET`: Your Vipps MobilePay client secret
- `MOBILEPAY_SUBSCRIPTION_KEY`: Your Vipps API subscription key
- `MOBILEPAY_ENVIRONMENT`: Set to 'sandbox' for testing, 'production' for live

**⚠️ Security Note**: Never commit actual credentials to version control. Always use environment variables.

## Workflow Details

### 1. Sales Creation Flow

```typescript
// When MobilePay is selected as payment method:
1. Sale record created with status 'pending'
2. MobilePay payment link generated
3. Payment link sent via email to customer
4. Customer redirected to payment (optional)
```

### 2. Payment Processing Flow

```typescript
// Customer pays through MobilePay:
1. Customer clicks payment link in email
2. MobilePay processes payment
3. MobilePay sends webhook notification
4. Webhook updates sale status to 'completed'
5. Payment transaction recorded
```

### 3. Email Template

The system sends a professional HTML email with:
- Customer name
- Product details
- Payment amount
- Direct payment link
- Company branding

### 4. Webhook Events

The webhook handles these MobilePay events:
- `Payment.Captured`: Payment successful → Update sale to completed
- `Payment.Cancelled`: Payment cancelled → Keep sale as pending
- `Payment.Refunded`: Payment refunded → Update accordingly

## Configuration

### Environment Variables

Configure these in Supabase Dashboard > Settings > Edge Functions > Environment Variables:

```
MOBILEPAY_CLIENT_ID=your_client_id
MOBILEPAY_CLIENT_SECRET=your_client_secret
MOBILEPAY_SUBSCRIPTION_KEY=your_subscription_key
MOBILEPAY_ENVIRONMENT=sandbox
MOBILEPAY_WEBHOOK_URL=https://your-project.supabase.co/functions/v1/mobilepay-webhook
```

### MobilePay Configuration

In your MobilePay developer dashboard:

1. **Webhook URL**: `https://your-project.supabase.co/functions/v1/mobilepay-webhook`
2. **Redirect URL**: Set to your application domain
3. **Events**: Enable payment confirmations

## Testing

### 1. Test Sales Creation

1. Go to Sales Management
2. Create new sale with MobilePay payment method
3. Verify payment link is generated
4. Check customer receives email

### 2. Test Payment Flow

1. Click payment link in email
2. Complete payment in MobilePay sandbox
3. Verify sale status updates automatically
4. Check payment transaction is recorded

### 3. Test Webhook

1. Use MobilePay sandbox to simulate payment
2. Check Supabase logs for webhook activity
3. Verify sale status change

## Error Handling

### Common Issues

1. **401 Authentication Error**
   - Verify MobilePay credentials are set
   - Check environment variables
   - Ensure proper API endpoints

2. **Email Not Sending**
   - Check email service configuration
   - Verify customer email address
   - Check email templates

3. **Webhook Not Working**
   - Verify webhook URL is accessible
   - Check MobilePay webhook configuration
   - Review Supabase function logs

### Debugging

Check these locations for logs:
- Supabase Dashboard > Edge Functions > Logs
- Browser console for frontend errors
- Email service logs for delivery issues

## Security

### Best Practices

1. **Credentials**: Store API credentials securely in environment variables
2. **Webhook Verification**: Implement signature verification for production
3. **HTTPS**: Always use HTTPS for webhook endpoints
4. **Input Validation**: Validate all inputs before processing

### Webhook Security

For production, implement webhook signature verification:

```typescript
// Example webhook verification
const signature = req.headers.get('X-MobilePay-Signature');
if (signature && MOBILEPAY_WEBHOOK_SECRET) {
  // Verify signature using HMAC
}
```

## Monitoring

### Key Metrics

- Payment success rate
- Email delivery rate
- Webhook response times
- Sale completion rate

### Alerts

Set up alerts for:
- Failed payment attempts
- Email delivery failures
- Webhook processing errors
- API authentication failures

## Support

For issues with the MobilePay integration:

1. Check the error logs in Supabase
2. Verify MobilePay API status
3. Test in sandbox environment first
4. Review webhook configuration

## API Reference

### Create Payment Link

```typescript
await mobilepayService.createPaymentLink({
  externalId: saleId,
  amount: totalPrice,
  currency: 'DKK',
  description: 'Payment for product',
  customerEmail: 'customer@example.com',
  customerName: 'Customer Name',
  saleId: 'sale_uuid'
});
```

### Webhook Response

```json
{
  "success": true,
  "message": "MobilePay webhook processed"
}
```

## Future Enhancements

1. **Recurring Payments**: Support for subscription payments
2. **Partial Payments**: Allow installment payments
3. **Payment Refunds**: Process refunds through API
4. **Advanced Analytics**: Detailed payment reporting
5. **Multi-currency**: Support for multiple currencies
6. **Mobile App**: Native mobile payment integration

## Changelog

### Version 1.0.0 (Current)
- Initial MobilePay integration
- Payment link generation
- Email notifications
- Webhook processing
- Automatic status updates

---
---

## Troubleshooting and Resolution Log

This section details the debugging process undertaken to get the MobilePay integration working correctly. It covers the series of errors encountered and the corresponding fixes.

### 1. Error: `401 Unauthorized - {"error":"Missing client_id or client_secret"}`

-   **Symptom:** The very first calls to the MobilePay API were failing with a `401` error, even though logs showed the environment variables were set.
-   **Root Cause:** The Vipps/MobilePay ePayment API has a non-standard authentication flow. It does not use a `Basic` Authorization header. Instead, it requires the `client_id` and `client_secret` to be passed as separate, distinct headers in the request.
-   **Fix:** The `getAccessToken` function in `supabase/functions/mobilepay-api-proxy/index.ts` was modified to remove the `Authorization: Basic ...` header and instead send `client_id` and `client_secret` as top-level headers.

### 2. Error: `400 Bad Request - "idempotency-Key is required", "merchant-Serial-Number is required"`

-   **Symptom:** After fixing authentication, calls to create payments failed with a `400` error, complaining about missing headers.
-   **Root Cause:** All POST/PATCH requests to the MobilePay API require an `Idempotency-Key` (to prevent duplicate requests) and a `Merchant-Serial-Number` (to identify the merchant). The code was not sending these.
-   **Fix:**
    1.  A new environment variable, `MOBILEPAY_MERCHANT_SERIAL_NUMBER`, was introduced.
    2.  The backend function was updated to add the `Merchant-Serial-Number` header to all relevant API calls.
    3.  The backend function was updated to generate a unique `Idempotency-Key` (using `crypto.randomUUID()`) for every state-changing request.

### 3. Error: `404 Not Found - "no Route matched with those values"`

-   **Symptom:** Calls to create a *recurring* payment agreement were failing with a `404`, even though the URL (`/recurring/v1/agreements`) appeared correct.
-   **Root Cause:** The MobilePay ePayment API (for single payments) and the Recurring API use **different subscription keys**. Using the ePayment key to call a Recurring API endpoint results in the API gateway not finding the route, leading to a `404`.
-   **Fix:**
    1.  A new environment variable, `MOBILEPAY_RECURRING_SUBSCRIPTION_KEY`, was introduced to hold the key specific to the Recurring API.
    2.  The backend function was updated to use this new key for all recurring payment actions (`createRecurringPaymentAgreement`, `cancelAgreement`), while still using the original key for ePayment actions.

### 4. Error: `400 Bad Request - "Invalid currency for merchant"`

-   **Symptom:** Test calls for single payments were failing with a currency error.
-   **Root Cause:** The currency hardcoded in the frontend test component (`NOK`) did not match the currency of the merchant's MobilePay account (which was `DKK`).
-   **Fix:** The currency in the frontend component `src/components/MobilePaySettings.tsx` was changed from `"NOK"` to `"DKK"` to match the merchant's registered market.

### 5. Error: `400 Bad Request - "Invalid amount"`

-   **Symptom:** The final error in the chain. The API rejected the amount, stating it must be an integer in the smallest currency unit (e.g., øre, cents).
-   **Root Cause:** The frontend was sending a decimal amount (e.g., `49.99`), and a miscommunication was occurring during the data transfer to the backend.
-   **Fix:** The responsibility was clarified.
    1.  **Frontend:** The component `src/components/MobilePaySettings.tsx` was updated to convert all amounts to integers before sending them (e.g., `49.99` became `4999`).
    2.  **Backend:** The `* 100` multiplication logic was removed from the backend function, as it now expects the amount to arrive pre-formatted as an integer.

---

## Final Configuration Summary

To ensure the integration works correctly, the following setup is required.

### Required Environment Variables

The following secrets must be set in your Supabase project (`Settings > Edge Functions`):

-   `MOBILEPAY_CLIENT_ID`: Your main client ID.
-   `MOBILEPAY_CLIENT_SECRET`: Your main client secret.
-   `MOBILEPAY_MERCHANT_SERIAL_NUMBER`: The Merchant Serial Number (MSN) for your sales unit.
-   `MOBILEPAY_SUBSCRIPTION_KEY`: The subscription key for the **ePayment API** (for single payments).
-   `MOBILEPAY_RECURRING_SUBSCRIPTION_KEY`: The subscription key for the **Recurring API** (for subscriptions).
-   `MOBILEPAY_WEBHOOK_URL`: The full URL to your deployed webhook function.

### Core Logic

-   **Amounts:** The frontend is responsible for converting all currency amounts to the smallest integer unit (e.g., `100.50` DKK becomes `10050`) before sending them to the backend.
-   **IDs:** For single payments, the `externalId` sent to the backend must be a string between 8-64 characters containing only letters, numbers, and hyphens. The `mobilepayService.ts` now handles generating a compliant ID automatically.