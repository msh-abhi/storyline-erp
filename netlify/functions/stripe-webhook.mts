import type { Context, Config } from "@netlify/functions";

/**
 * Stripe Webhook handler for the Admin Billing System.
 * Handles checkout.session.completed, invoice.payment_succeeded,
 * invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted.
 *
 * POST /api/billing/stripe-webhook
 */
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeSecretKey = Netlify.env.get("STRIPE_SECRET_KEY");
  const stripeWebhookSecret = Netlify.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Netlify.env.get("VITE_SUPABASE_URL") || "";
  const supabaseServiceKey = Netlify.env.get("VITE_SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!stripeSecretKey || !stripeWebhookSecret) {
    console.error("Stripe webhook: missing env vars");
    return new Response("Stripe not configured", { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  // ---- Stripe webhook signature verification (manual HMAC) ----
  try {
    const sigValid = await verifyStripeSignature(rawBody, signature, stripeWebhookSecret);
    if (!sigValid) {
      console.warn("Stripe webhook: invalid signature");
      return new Response("Invalid signature", { status: 400 });
    }
  } catch (err) {
    console.error("Stripe webhook signature error:", err);
    return new Response("Signature verification failed", { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log(`Stripe webhook received: ${event.type}`);

  try {
    await handleStripeEvent(event, supabaseUrl, supabaseServiceKey);
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    // Still return 200 to prevent Stripe retries for non-recoverable errors
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

// ---- Event handler ----
async function handleStripeEvent(
  event: any,
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  const supabaseHeaders = {
    "Content-Type": "application/json",
    apikey: supabaseServiceKey,
    Authorization: `Bearer ${supabaseServiceKey}`,
  };

  async function getAdminSub() {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/admin_subscription?select=id&limit=1`,
      { headers: supabaseHeaders }
    );
    const rows = await res.json() as any[];
    return rows?.[0];
  }

  async function upsertSubscription(data: Record<string, any>) {
    const sub = await getAdminSub();
    const url = sub
      ? `${supabaseUrl}/rest/v1/admin_subscription?id=eq.${sub.id}`
      : `${supabaseUrl}/rest/v1/admin_subscription`;
    const method = sub ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: supabaseHeaders,
      body: JSON.stringify(data),
    });
  }

  async function insertTransaction(data: Record<string, any>) {
    const sub = await getAdminSub();
    await fetch(`${supabaseUrl}/rest/v1/admin_billing_transactions`, {
      method: "POST",
      headers: supabaseHeaders,
      body: JSON.stringify({ ...data, subscription_id: sub?.id }),
    });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription") break;
      const includesMaintenance =
        session.metadata?.includes_maintenance === "true";
      const totalAmount = session.amount_total ?? (includesMaintenance ? 8800 : 5900);
      await upsertSubscription({
        status: "active",
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        payment_gateway: "stripe",
        plan_maintenance: includesMaintenance,
        monthly_amount: totalAmount,
      });
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      if (!invoice.subscription) break;
      const includesMaintenance = invoice.lines?.data?.length > 1;
      const periodStart = invoice.lines?.data?.[0]?.period?.start;
      const periodEnd = invoice.lines?.data?.[0]?.period?.end;
      await upsertSubscription({
        status: "active",
        current_period_start: periodStart
          ? new Date(periodStart * 1000).toISOString()
          : undefined,
        current_period_end: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : undefined,
        next_billing_date: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : undefined,
        stripe_subscription_id: invoice.subscription,
      });
      await insertTransaction({
        amount: invoice.amount_paid,
        currency: invoice.currency,
        core_amount: 5900,
        maintenance_amount: includesMaintenance ? 2900 : 0,
        gateway: "stripe",
        gateway_tx_id: invoice.payment_intent,
        gateway_invoice_id: invoice.id,
        gateway_receipt_url: invoice.hosted_invoice_url,
        status: "succeeded",
        period_start: periodStart
          ? new Date(periodStart * 1000).toISOString()
          : undefined,
        period_end: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : undefined,
        includes_maintenance: includesMaintenance,
        description: `Monthly ERP retainer${includesMaintenance ? " + Maintenance" : ""}`,
        provider_payload: invoice,
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      await upsertSubscription({ status: "past_due" });
      await insertTransaction({
        amount: invoice.amount_due,
        currency: invoice.currency,
        core_amount: 5900,
        maintenance_amount: 0,
        gateway: "stripe",
        gateway_tx_id: invoice.payment_intent,
        gateway_invoice_id: invoice.id,
        status: "failed",
        includes_maintenance: false,
        description: "Payment failed — retainer renewal",
        provider_payload: invoice,
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      await upsertSubscription({
        status: sub.status,
        stripe_subscription_id: sub.id,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        next_billing_date: new Date(sub.current_period_end * 1000).toISOString(),
        canceled_at: sub.canceled_at
          ? new Date(sub.canceled_at * 1000).toISOString()
          : null,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await upsertSubscription({
        status: "canceled",
        canceled_at: new Date().toISOString(),
        stripe_subscription_id: sub.id,
      });
      break;
    }

    default:
      console.log(`Unhandled Stripe event: ${event.type}`);
  }
}

// ---- Stripe HMAC signature verification ----
async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string
): Promise<boolean> {
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("=") as [string, string])
  );
  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  );
  const computedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHex === v1;
}

export const config: Config = {
  path: "/api/billing/stripe-webhook",
};
