import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-WC-Webhook-Source, X-WC-Webhook-Topic, X-WC-Webhook-Signature',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface WooCommerceOrder {
  id: number;
  number: string;
  status: string;
  currency: string;
  date_created: string;
  date_completed?: string;
  total: string;
  customer_note: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    variation_id: number;
    quantity: number;
    subtotal: string;
    total: string;
    sku: string;
    price: number;
    meta_data: Array<{ key: string; value: any }>;
  }>;
  meta_data: Array<{ key: string; value: any }>;
}

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

    const webhookTopic = req.headers.get('X-WC-Webhook-Topic');
    const webhookSource = req.headers.get('X-WC-Webhook-Source');

    console.log('Webhook received:', { topic: webhookTopic, source: webhookSource });

    let payload: WooCommerceOrder;
    let textPayload: string;

    try {
      textPayload = await req.text(); // Read the body once
      console.log('Raw payload:', textPayload);

      try {
        payload = JSON.parse(textPayload) as WooCommerceOrder; // Try parsing as JSON
      } catch (jsonError) {
        console.error('Error parsing JSON payload:', jsonError);
        // If JSON parsing fails, try parsing as URL-encoded data
        try {
          const urlSearchParams = new URLSearchParams(textPayload);
          payload = JSON.parse(JSON.stringify(Object.fromEntries(urlSearchParams))) as WooCommerceOrder;
        } catch (urlError) {
          console.error('Error parsing URL-encoded payload:', urlError);
          throw new Error('Invalid payload format: Could not parse as JSON or URL-encoded data');
        }
      }
    } catch (payloadError) {
      console.error('Error getting or parsing payload:', payloadError);
      throw new Error('Could not read payload');
    }

    // Check if customerEmail exists and handle the case where it doesn't
    let customerEmail: string | undefined = payload.billing?.email;
    const customerName = `${payload.billing?.first_name || ''} ${payload.billing?.last_name || ''}`.trim();

    if (!customerEmail) {
      console.warn('Customer email is missing in the payload.');
      // Try to extract email from other fields or set a default
      customerEmail = payload.meta_data?.find(meta => meta.key === '_customer_email')?.value || undefined; // Check meta_data
      if (!customerEmail) {
        console.error('Customer email is required, and no alternative email found.');
        throw new Error('Customer email is required'); // Still throw an error if no email can be found
      }
    }

    let customerId: string | null = null;

    try {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customerEmail)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        console.log('Customer already exists:', customerId);
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: customerName || customerEmail,
            email: customerEmail,
            whatsapp_number: payload.billing?.phone || null,
            custom_fields: {
              woocommerce_customer_id: payload.id,
              billing_phone: payload.billing?.phone,
              billing_address: `${payload.billing?.address_1} ${payload.billing?.address_2}`.trim(),
              billing_city: payload.billing?.city,
              billing_state: payload.billing?.state,
              billing_postcode: payload.billing?.postcode,
              billing_country: payload.billing?.country,
            },
            created_at: payload.date_created,
          })
          .select('id')
          .single();

        if (customerError) {
          console.error('Error creating customer:', customerError);
          throw customerError;
        }

        customerId = newCustomer.id;
        console.log('New customer created:', customerId);
      }
    } catch (customerLookupError) {
      console.error('Error during customer lookup/creation:', customerLookupError);
      throw customerLookupError;
    }

    const products = payload.line_items.map(item => ({
      id: item.product_id,
      variation_id: item.variation_id,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      price: parseFloat(item.total),
      subtotal: parseFloat(item.subtotal),
      meta_data: item.meta_data,
    }));

    try {
      for (const item of payload.line_items) {
        const { error: productError } = await supabase
          .from('woocommerce_products')
          .upsert({
            woo_product_id: item.product_id,
            name: item.name,
            sku: item.sku,
            price: item.price,
            synced_at: new Date().toISOString(),
          }, {
            onConflict: 'woo_product_id',
            ignoreDuplicates: false,
          });

        if (productError) {
          console.error('Error upserting product:', productError);
        }
      }
    } catch (productUpsertError) {
      console.error('Error during product upsert:', productUpsertError);
    }

    let orderData: any = null; // Declare orderData outside the try block

    try {
      const { data, error: orderError } = await supabase
        .from('woocommerce_orders')
        .upsert({
          woo_order_id: payload.id,
          customer_id: customerId,
          customer_email: customerEmail,
          customer_name: customerName,
          order_number: payload.number,
          order_status: payload.status,
          total_amount: parseFloat(payload.total),
          currency: payload.currency,
          payment_method: payload.payment_method,
          payment_method_title: payload.payment_method_title,
          transaction_id: payload.transaction_id,
          order_date: payload.date_created,
          completed_date: payload.date_completed || null,
          products: products,
          billing_info: payload.billing,
          shipping_info: payload.shipping,
          customer_note: payload.customer_note,
          metadata: payload.meta_data,
          synced_at: new Date().toISOString(),
        }, {
          onConflict: 'woo_order_id',
          ignoreDuplicates: false,
        })
        .select('id')
        .single();

      if (orderError) {
        console.error('Error upserting order:', orderError);

        await supabase.from('woocommerce_sync_log').insert({
          sync_type: 'order',
          woo_id: payload.id,
          status: 'failed',
          error_message: orderError.message,
          payload: payload,
        });

        throw orderError;
      }

      orderData = data; // Assign the value to orderData inside the try block

      const subscriptionMeta = payload.meta_data?.find(
        meta => meta.key === '_subscription_renewal' || meta.key === 'subscription_id'
      );

      if (subscriptionMeta && payload.line_items.length > 0) {
        for (const item of payload.line_items) {
          const isSubscription = item.meta_data?.some(
            meta => meta.key === '_subscription_period' || meta.key === 'subscription_type'
          );

          if (isSubscription) {
            const subscriptionPeriod = item.meta_data?.find(m => m.key === '_subscription_period')?.value || 'month';
            const subscriptionInterval = item.meta_data?.find(m => m.key === '_subscription_interval')?.value || 1;

            const startDate = new Date(payload.date_created);
            const nextPaymentDate = new Date(startDate);

            if (subscriptionPeriod === 'day') {
              nextPaymentDate.setDate(nextPaymentDate.getDate() + subscriptionInterval);
            } else if (subscriptionPeriod === 'week') {
              nextPaymentDate.setDate(nextPaymentDate.getDate() + (subscriptionInterval * 7));
            } else if (subscriptionPeriod === 'month') {
              nextPaymentDate.setMonth(nextPaymentDate.getMonth() + subscriptionInterval);
            } else if (subscriptionPeriod === 'year') {
              nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + subscriptionInterval);
            }

            const { data: productData } = await supabase
              .from('woocommerce_products')
              .select('id')
              .eq('woo_product_id', item.product_id)
              .maybeSingle();

            await supabase.from('woocommerce_subscriptions').insert({
              woo_subscription_id: subscriptionMeta.value || payload.id,
              customer_id: customerId,
              order_id: orderData.id,
              product_id: productData?.id || null,
              status: 'active',
              start_date: payload.date_created,
              next_payment_date: nextPaymentDate.toISOString(),
              billing_period: subscriptionPeriod,
              billing_interval: subscriptionInterval,
              total_amount: parseFloat(item.total),
              metadata: item.meta_data,
            });
          }
        }
      }
    } catch (orderProcessingError) {
      console.error('Error during order processing:', orderProcessingError);
    }

    try {
      await supabase.from('woocommerce_sync_log').insert({
        sync_type: 'order',
        woo_id: payload.id,
        status: 'success',
        payload: payload,
      });
    } catch (syncLogError) {
      console.error('Error writing to sync log:', syncLogError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order synced successfully',
        orderId: orderData?.id, // Use optional chaining to access id
        customerId: customerId,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process webhook'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
