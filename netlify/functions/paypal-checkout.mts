import type { Context, Config } from "@netlify/functions";

/**
 * PayPal subscription checkout creator for the Admin Billing System.
 * Uses PayPal REST API to create a subscription order.
 *
 * POST /api/billing/paypal-checkout
 * Body: { includeMaintenance: boolean }
 */
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  const clientId = Netlify.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Netlify.env.get("PAYPAL_CLIENT_SECRET");
  const appUrl = Netlify.env.get("VITE_APP_URL") || "https://app.storyline.help";
  // Set to "live" for production
  const paypalMode = Netlify.env.get("PAYPAL_MODE") || "live";
  const paypalBase = paypalMode === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  if (!clientId || !clientSecret) {
    return new Response(
      JSON.stringify({ error: "PayPal is not configured on the server." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { includeMaintenance?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const { includeMaintenance = false } = body;
  const totalUsd = includeMaintenance ? "88.00" : "59.00";
  const description = includeMaintenance
    ? "JyskStream ERP - Core Subscription + Maintenance Add-on ($88/mo)"
    : "JyskStream ERP - Core Subscription ($59/mo)";

  try {
    // Step 1: Get PayPal access token
    const tokenRes = await fetch(`${paypalBase}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("PayPal token error:", err);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with PayPal" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { access_token } = await tokenRes.json() as any;

    // Step 2: Create a PayPal order (one-time; for recurring use PayPal Subscriptions API)
    // We create an order capturing the first month's payment; subsequent months handled
    // via separate PayPal Subscription plan if configured.
    const orderRes = await fetch(`${paypalBase}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
        "PayPal-Request-Id": `jysk-erp-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            description,
            custom_id: `jysk_erp_${includeMaintenance ? "full" : "core"}`,
            amount: {
              currency_code: "USD",
              value: totalUsd,
              breakdown: {
                item_total: { currency_code: "USD", value: totalUsd },
              },
            },
            items: includeMaintenance
              ? [
                  {
                    name: "JyskStream ERP - Core Subscription",
                    quantity: "1",
                    unit_amount: { currency_code: "USD", value: "59.00" },
                  },
                  {
                    name: "JyskStream ERP - Maintenance Add-on",
                    quantity: "1",
                    unit_amount: { currency_code: "USD", value: "29.00" },
                  },
                ]
              : [
                  {
                    name: "JyskStream ERP - Core Subscription",
                    quantity: "1",
                    unit_amount: { currency_code: "USD", value: "59.00" },
                  },
                ],
          },
        ],
        application_context: {
          brand_name: "Tecnomaxx Digital / StoryLine ERP",
          locale: "en-US",
          landing_page: "BILLING",
          user_action: "PAY_NOW",
          return_url: `${appUrl}?billing_success=1&gateway=paypal`,
          cancel_url: `${appUrl}?billing_canceled=1&gateway=paypal`,
        },
      }),
    });

    const order = await orderRes.json() as any;

    if (!orderRes.ok) {
      console.error("PayPal order error:", order);
      return new Response(
        JSON.stringify({ error: order.message || "Failed to create PayPal order" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Find the approval link
    const approvalUrl = order.links?.find((l: any) => l.rel === "approve")?.href;

    return new Response(
      JSON.stringify({ url: approvalUrl, orderId: order.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("paypal-checkout function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config: Config = {
  path: "/api/billing/paypal-checkout",
};
