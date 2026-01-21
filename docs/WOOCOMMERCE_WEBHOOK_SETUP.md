# WooCommerce Webhook Quick Setup

## Your Webhook URL
```
https://otscpicqgfvbaokqzaac.supabase.co/functions/v1/woocommerce-webhook
```

## Setup Steps

### 1. Access WooCommerce Settings
1. Login to https://storyline.help/wp-admin
2. Go to **WooCommerce** → **Settings** → **Advanced** → **Webhooks**

### 2. Create "Order Created" Webhook
Click **Add webhook** and configure:

| Field | Value |
|-------|-------|
| **Name** | Order Created - Supabase Sync |
| **Status** | ✅ Active |
| **Topic** | Order created |
| **Delivery URL** | https://otscpicqgfvbaokqzaac.supabase.co/functions/v1/woocommerce-webhook |
| **Secret** | *(leave blank or generate random string)* |
| **API Version** | WP REST API Integration v3 |

Click **Save webhook**

### 3. Create "Order Updated" Webhook
Click **Add webhook** again and configure:

| Field | Value |
|-------|-------|
| **Name** | Order Updated - Supabase Sync |
| **Status** | ✅ Active |
| **Topic** | Order updated |
| **Delivery URL** | https://otscpicqgfvbaokqzaac.supabase.co/functions/v1/woocommerce-webhook |
| **Secret** | *(same as above if used)* |
| **API Version** | WP REST API Integration v3 |

Click **Save webhook**

### 4. Test the Integration
1. Create a test order on https://storyline.help
2. Check the webhook delivery log in WooCommerce
3. Verify the order appears in your ERP under "WooCommerce Orders"

## Verification Checklist
- [ ] Database migration applied in Supabase SQL Editor
- [ ] Edge function deployed (woocommerce-webhook)
- [ ] "Order Created" webhook active
- [ ] "Order Updated" webhook active
- [ ] Test order created successfully
- [ ] Test order visible in ERP
- [ ] Customer auto-created in ERP

## Monitoring

### Check Recent Orders in ERP
Navigate to: **WooCommerce Orders** in sidebar

### Check Sync Logs in Supabase
Run in SQL Editor:
```sql
SELECT * FROM woocommerce_sync_log
ORDER BY created_at DESC
LIMIT 10;
```

### Check Failed Syncs
```sql
SELECT * FROM woocommerce_sync_log
WHERE status = 'failed'
ORDER BY created_at DESC;
```

## Troubleshooting

### Webhook Not Firing?
- Check webhook status is "Active" in WooCommerce
- Verify delivery URL is correct
- Check WooCommerce webhook delivery logs

### Orders Not Appearing in ERP?
- Check sync logs for errors
- Verify edge function is deployed
- Test webhook delivery manually in WooCommerce

### Customer Not Created?
- Verify customer email is valid
- Check if customer already exists
- Review sync logs for specific errors

## Need Help?
Review the complete guide: `WOOCOMMERCE_INTEGRATION_GUIDE.md`
