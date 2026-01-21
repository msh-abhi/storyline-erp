# WooCommerce Integration Setup Guide

## Overview
This integration automatically syncs orders from your WooCommerce store (storyline.help) to your ERP system, creating customer accounts and storing all order details.

## Features Implemented

### ✅ Database Schema
- **woocommerce_orders**: Store all order details from WooCommerce
- **woocommerce_products**: Track products from orders
- **woocommerce_subscriptions**: Manage subscription products
- **woocommerce_sync_log**: Monitor sync activities and errors

### ✅ Edge Functions
- **woocommerce-webhook**: Listens for WooCommerce webhooks and syncs orders

### ✅ Frontend Components
- **WooCommerceOrders**: Admin panel to view and manage synced orders
- Real-time order statistics dashboard
- Detailed order view with customer and product information

---

## Setup Instructions

### Step 1: Apply Database Migration

Since you're manually running migrations, execute the following SQL in your Supabase SQL Editor:

**File location**: `supabase/migrations/20250710120000_woocommerce_integration.sql`

```sql
-- Copy and paste the entire content of the migration file into Supabase SQL Editor
-- This will create the following tables:
-- - woocommerce_orders
-- - woocommerce_products
-- - woocommerce_subscriptions
-- - woocommerce_sync_log
```

### Step 2: Deploy Edge Function

Since you're manually deploying edge functions, follow these steps:

1. **Navigate to Supabase Dashboard**
   - Go to https://supabase.com/dashboard/project/otscpicqgfvbaokqzaac
   - Click on "Edge Functions" in the left sidebar

2. **Create New Function**
   - Click "Create a new function"
   - Name it: `woocommerce-webhook`
   - Copy the content from: `supabase/functions/woocommerce-webhook/index.ts`
   - Paste it into the function editor
   - Click "Deploy"

3. **Get Your Webhook URL**
   After deployment, your webhook URL will be:
   ```
   https://otscpicqgfvbaokqzaac.supabase.co/functions/v1/woocommerce-webhook
   ```

### Step 3: Configure WooCommerce Webhooks

1. **Login to WordPress Admin**
   - Go to https://storyline.help/wp-admin

2. **Navigate to WooCommerce Webhooks**
   - Go to: WooCommerce → Settings → Advanced → Webhooks
   - Click "Add webhook"

3. **Create Order Created Webhook**
   ```
   Name: Order Created - Supabase Sync
   Status: Active
   Topic: Order created
   Delivery URL: https://otscpicqgfvbaokqzaac.supabase.co/functions/v1/woocommerce-webhook
   Secret: [Leave blank or use a secure random string]
   API Version: WP REST API Integration v3
   ```

4. **Create Order Updated Webhook**
   ```
   Name: Order Updated - Supabase Sync
   Status: Active
   Topic: Order updated
   Delivery URL: https://otscpicqgfvbaokqzaac.supabase.co/functions/v1/woocommerce-webhook
   Secret: [Leave blank or use a secure random string]
   API Version: WP REST API Integration v3
   ```

5. **Save Both Webhooks**

### Step 4: Test the Integration

1. **Create a Test Order**
   - Go to your WooCommerce store: https://storyline.help
   - Add a product to cart and complete checkout
   - Use a real email address (you can use a test one like: test@example.com)

2. **Check Sync in ERP**
   - Login to your ERP system
   - Navigate to "WooCommerce Orders" in the sidebar
   - You should see the test order appear within seconds

3. **Verify Customer Creation**
   - Navigate to "Customer Management → Customers"
   - The customer should be automatically created with their email and details

### Step 5: Monitor Sync Activity

**View Sync Logs**
You can monitor sync activity by querying the database:

```sql
-- View recent sync logs
SELECT * FROM woocommerce_sync_log
ORDER BY created_at DESC
LIMIT 20;

-- View failed syncs
SELECT * FROM woocommerce_sync_log
WHERE status = 'failed'
ORDER BY created_at DESC;

-- View synced orders
SELECT
  order_number,
  customer_email,
  order_status,
  total_amount,
  currency,
  order_date
FROM woocommerce_orders
ORDER BY order_date DESC;
```

---

## How It Works

### Order Flow

1. **Customer Places Order on storyline.help**
   - Customer completes checkout on WooCommerce

2. **WooCommerce Sends Webhook**
   - WooCommerce triggers webhook to Supabase Edge Function

3. **Edge Function Processes Order**
   - Validates webhook payload
   - Checks if customer exists in ERP
   - Creates new customer if needed
   - Syncs product information
   - Creates order record
   - Detects and creates subscription records (if applicable)
   - Logs sync activity

4. **ERP Updates**
   - Admin sees new order in WooCommerce Orders section
   - Customer appears in Customer Management
   - Order statistics update in real-time

### Customer Auto-Creation

When an order comes in:
- System checks if customer email exists
- If exists: Links order to existing customer
- If new: Creates customer with:
  - Name from billing info
  - Email address
  - Phone number (if provided)
  - Billing address stored in custom fields
  - WooCommerce customer ID for reference

### Data Stored

**For Each Order:**
- Order number and WooCommerce ID
- Customer information
- Order status (pending, processing, completed, etc.)
- Total amount and currency
- Payment method and transaction ID
- Order date and completion date
- All product details (name, SKU, quantity, price)
- Billing and shipping addresses
- Customer notes
- Metadata from WooCommerce

---

## Admin Panel Features

### WooCommerce Orders Dashboard

**Statistics Cards:**
- Total Orders
- Completed Orders
- Processing Orders
- Total Revenue

**Search & Filter:**
- Search by order number, customer email, or name
- Filter by order status (all, pending, processing, completed, cancelled, etc.)

**Order Table:**
- Order status with visual indicators
- Order number and WooCommerce ID
- Customer name and email
- Number of items
- Total amount with currency
- Order date
- Quick "View" action

**Detailed Order View:**
- Complete customer information
- Billing and shipping addresses
- All order items with SKU, quantity, and pricing
- Payment details and transaction ID
- Customer notes
- Direct link to view/edit order in WooCommerce admin

---

## Troubleshooting

### Orders Not Syncing

1. **Check Webhook Status**
   - Go to WooCommerce → Settings → Advanced → Webhooks
   - Ensure webhook status is "Active"
   - Check delivery logs for errors

2. **Check Edge Function Logs**
   ```sql
   SELECT * FROM woocommerce_sync_log
   WHERE status = 'failed'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

3. **Verify Webhook URL**
   - Ensure URL is correct: `https://otscpicqgfvbaokqzaac.supabase.co/functions/v1/woocommerce-webhook`
   - Test by triggering a manual webhook delivery in WooCommerce

### Customer Not Created

Check if:
- Customer email is valid
- Email already exists in system
- View sync logs for specific error messages

### Duplicate Orders

If you see duplicate orders:
- This shouldn't happen due to unique constraints on `woo_order_id`
- Check if multiple webhooks are configured
- Review webhook delivery logs in WooCommerce

---

## Database Structure

### woocommerce_orders
Main order storage with full order details and relationships to customers.

**Key Fields:**
- `woo_order_id`: Unique WooCommerce order ID
- `customer_id`: Links to customers table
- `order_status`: Current order status
- `products`: JSON array of all order items
- `billing_info` & `shipping_info`: Full address details

### woocommerce_products
Product information extracted from orders.

**Key Fields:**
- `woo_product_id`: Unique WooCommerce product ID
- `is_subscription`: Boolean flag for subscription products
- `subscription_period` & `subscription_interval`: Subscription billing details

### woocommerce_subscriptions
Dedicated subscription tracking (for subscription products).

**Key Fields:**
- `woo_subscription_id`: Unique subscription ID
- `status`: active, pending, cancelled, expired
- `next_payment_date`: Next billing date
- `billing_period` & `billing_interval`: Billing frequency

### woocommerce_sync_log
Audit trail for all sync activities.

**Key Fields:**
- `sync_type`: order, product, subscription, customer
- `status`: success, failed, partial
- `error_message`: Details if sync failed
- `payload`: Complete webhook payload for debugging

---

## Security

### Row Level Security (RLS)
All tables have RLS enabled with policies that:
- Allow authenticated users to read/write
- Can be customized for role-based access

### Webhook Security
Consider implementing:
- WooCommerce webhook signatures validation
- IP whitelisting
- Rate limiting

---

## Advanced Features

### Manual Order Sync
If you need to manually sync old orders, you can create a batch sync function or use WooCommerce REST API:

```typescript
// Example: Fetch orders from WooCommerce REST API
const WooCommerce = require('woocommerce-api');

const woocommerce = new WooCommerce({
  url: 'https://storyline.help',
  consumerKey: 'your_consumer_key',
  consumerSecret: 'your_consumer_secret',
  version: 'wc/v3'
});

woocommerce.get('orders', function(err, data, res) {
  // Process and sync orders to Supabase
});
```

### Subscription Management
The system automatically detects subscription products and creates subscription records with:
- Billing period and interval
- Next payment date calculation
- Subscription status tracking

### Custom Webhooks
You can add more webhooks for:
- Order status changes
- Subscription renewals
- Subscription cancellations
- Product updates
- Customer updates

---

## API Endpoints

### Webhook Endpoint
```
POST https://otscpicqgfvbaokqzaac.supabase.co/functions/v1/woocommerce-webhook
```

**Expected Headers:**
- `X-WC-Webhook-Topic`: order.created, order.updated, etc.
- `X-WC-Webhook-Source`: Your WooCommerce store URL
- `Content-Type`: application/json

**Response:**
```json
{
  "success": true,
  "message": "Order synced successfully",
  "orderId": "uuid",
  "customerId": "uuid"
}
```

---

## Support & Maintenance

### Regular Maintenance Tasks

1. **Monitor Sync Logs**
   - Check for failed syncs weekly
   - Review error patterns

2. **Clean Old Logs**
   ```sql
   -- Delete logs older than 90 days
   DELETE FROM woocommerce_sync_log
   WHERE created_at < NOW() - INTERVAL '90 days';
   ```

3. **Verify Order Counts**
   ```sql
   -- Compare order counts
   SELECT
     DATE(order_date) as date,
     COUNT(*) as orders,
     SUM(total_amount) as revenue
   FROM woocommerce_orders
   GROUP BY DATE(order_date)
   ORDER BY date DESC
   LIMIT 30;
   ```

### Future Enhancements

Consider adding:
- ✨ Automatic order status updates back to WooCommerce
- ✨ Inventory sync between ERP and WooCommerce
- ✨ Customer portal for order tracking
- ✨ Automated email notifications for order events
- ✨ Analytics dashboard for WooCommerce sales
- ✨ Refund handling and tracking
- ✨ Subscription renewal reminders

---

## Conclusion

Your WooCommerce integration is now complete! Orders will automatically sync from storyline.help to your ERP system, creating customers and storing all order details.

**Quick Checklist:**
- ✅ Database migration applied
- ✅ Edge function deployed
- ✅ Webhooks configured in WooCommerce
- ✅ Test order created and synced
- ✅ Customer auto-creation verified
- ✅ Admin panel accessible

For questions or issues, check the sync logs first, then review WooCommerce webhook delivery logs.
