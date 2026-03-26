import type { Context, Config } from "@netlify/functions";

/**
 * Stripe Checkout Session creator for the Admin Billing System.
 * Creates a Stripe Checkout session for Peter's subscription.
 *
 * POST /api/billing/stripe-checkout
 * Body: { includeMaintenance: boolean, customerEmail?: string }
 */
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stripeSecretKey = Netlify.env.get("STRIPE_SECRET_KEY");
  const appUrl = Netlify.env.get("VITE_APP_URL") || "https://app.storyline.help";

  if (!stripeSecretKey) {
    return new Response(
      JSON.stringify({ error: "Stripe is not configured on the server." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { includeMaintenance?: boolean; customerEmail?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { includeMaintenance = false, customerEmail } = body;

  // Stripe price IDs (created via MCP)
  const CORE_PRICE_ID = "price_1TFHCQP1RrUm1n3meVE5npMt";        // $59/mo
  const MAINTENANCE_PRICE_ID = "price_1TFHCRP1RrUm1n3mc2QOaJzl"; // $29/mo

  const lineItems = [
    { price: CORE_PRICE_ID, quantity: 1 },
    ...(includeMaintenance ? [{ price: MAINTENANCE_PRICE_ID, quantity: 1 }] : []),
  ];

  try {
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        mode: "subscription",
        "line_items[0][price]": lineItems[0].price,
        "line_items[0][quantity]": "1",
        ...(includeMaintenance ? {
          "line_items[1][price]": lineItems[1].price,
          "line_items[1][quantity]": "1",
        } : {}),
        success_url: `${appUrl}?billing_success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}?billing_canceled=1`,
        "subscription_data[metadata][source]": "jyskstream_erp",
        "subscription_data[metadata][includes_maintenance]": String(includeMaintenance),
        ...(customerEmail ? { customer_email: customerEmail } : {}),
        allow_promotion_codes: "true",
      }),
    });

    const session = await stripeRes.json() as any;

    if (!stripeRes.ok) {
      console.error("Stripe API error:", session);
      return new Response(
        JSON.stringify({ error: session.error?.message || "Failed to create checkout session" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("stripe-checkout function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config: Config = {
  path: "/api/billing/stripe-checkout",
};
