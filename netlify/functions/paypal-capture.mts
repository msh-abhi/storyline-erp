import type { Context, Config } from "@netlify/functions";

/**
 * PayPal order capture endpoint.
 * Called after PayPal redirects back to the app with ?token=ORDER_ID
 *
 * POST /api/billing/paypal-capture
 * Body: { orderId: string, includeMaintenance: boolean }
 */
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  const clientId = Netlify.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Netlify.env.get("PAYPAL_CLIENT_SECRET");
  const supabaseUrl = Netlify.env.get("VITE_SUPABASE_URL") || "";
  const supabaseServiceKey = Netlify.env.get("VITE_SUPABASE_SERVICE_ROLE_KEY") || "";
  const paypalMode = Netlify.env.get("PAYPAL_MODE") || "live";
  const paypalBase = paypalMode === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  if (!clientId || !clientSecret) {
    return new Response(
      JSON.stringify({ error: "PayPal is not configured." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { orderId: string; includeMaintenance?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const { orderId, includeMaintenance = false } = body;

  // We silently succeed if no orderId (PayPal sometimes passes token in query)
  if (!orderId) {
    return new Response(JSON.stringify({ error: "orderId is required" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Step 1: Get access token
    const tokenRes = await fetch(`${paypalBase}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: "grant_type=client_credentials",
    });
    const { access_token } = await tokenRes.json() as any;

    // Step 2: Capture the order
    const captureRes = await fetch(
      `${paypalBase}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
      }
    );
    const capture = await captureRes.json() as any;

    if (!captureRes.ok || capture.status !== "COMPLETED") {
      console.error("PayPal capture failed:", capture);
      return new Response(
        JSON.stringify({ error: capture.message || "Capture failed" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 3: Update Supabase admin_subscription + insert transaction
    const supabaseHeaders = {
      "Content-Type": "application/json",
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
    };

    // Get existing sub record
    const subRes = await fetch(
      `${supabaseUrl}/rest/v1/admin_subscription?select=id&limit=1`,
      { headers: supabaseHeaders }
    );
    const subs = await subRes.json() as any[];
    const existingSub = subs?.[0];

    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const totalAmountUsd = includeMaintenance ? 8800 : 5900;
    const captureUnit = capture.purchase_units?.[0]?.payments?.captures?.[0];
    const captureId = captureUnit?.id;
    const captureAmount = Math.round(
      parseFloat(captureUnit?.amount?.value || "0") * 100
    );

    const subPayload = {
      status: "active",
      plan_core: true,
      plan_maintenance: includeMaintenance,
      monthly_amount: totalAmountUsd,
      payment_gateway: "paypal",
      paypal_order_id: orderId,
      current_period_start: now.toISOString(),
      current_period_end: nextMonth.toISOString(),
      next_billing_date: nextMonth.toISOString(),
    };

    if (existingSub) {
      await fetch(
        `${supabaseUrl}/rest/v1/admin_subscription?id=eq.${existingSub.id}`,
        { method: "PATCH", headers: supabaseHeaders, body: JSON.stringify(subPayload) }
      );
    } else {
      await fetch(
        `${supabaseUrl}/rest/v1/admin_subscription`,
        { method: "POST", headers: supabaseHeaders, body: JSON.stringify(subPayload) }
      );
    }

    // Re-fetch sub id for transaction
    const subRes2 = await fetch(
      `${supabaseUrl}/rest/v1/admin_subscription?select=id&limit=1`,
      { headers: supabaseHeaders }
    );
    const subs2 = await subRes2.json() as any[];
    const subId = subs2?.[0]?.id;

    await fetch(`${supabaseUrl}/rest/v1/admin_billing_transactions`, {
      method: "POST",
      headers: supabaseHeaders,
      body: JSON.stringify({
        subscription_id: subId,
        amount: captureAmount || totalAmountUsd,
        currency: "usd",
        core_amount: 5900,
        maintenance_amount: includeMaintenance ? 2900 : 0,
        gateway: "paypal",
        gateway_tx_id: captureId,
        gateway_invoice_id: orderId,
        gateway_receipt_url: `https://www.paypal.com/activity/payment/${captureId}`,
        status: "succeeded",
        period_start: now.toISOString(),
        period_end: nextMonth.toISOString(),
        includes_maintenance: includeMaintenance,
        description: `Monthly ERP retainer (PayPal)${includeMaintenance ? " + Maintenance" : ""}`,
        provider_payload: capture,
      }),
    });

    return new Response(
      JSON.stringify({ success: true, captureId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("paypal-capture error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config: Config = {
  path: "/api/billing/paypal-capture",
};
