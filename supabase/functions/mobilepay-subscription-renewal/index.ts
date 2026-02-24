// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// MobilePay environment variables
const MOBILEPAY_ENVIRONMENT = Deno.env.get('MOBILEPAY_ENVIRONMENT') || 'sandbox';
const MOBILEPAY_API_BASE_URL = MOBILEPAY_ENVIRONMENT === 'production'
    ? 'https://api.vipps.no'
    : 'https://apitest.vipps.no';

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase configuration');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Get subscriptions due for renewal in the next 3 days
        // MobilePay charges should be created at least 2 days before the due date
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const dateString = threeDaysFromNow.toISOString().split('T')[0];

        console.log(`Checking for subscriptions due on or before: ${dateString}`);

        const { data: subscriptions, error: subError } = await supabase
            .from('subscriptions')
            .select('*, customers(email, name)')
            .eq('status', 'active')
            .eq('payment_method', 'mobilepay')
            .not('mobilepay_agreement_id', 'is', null)
            .lte('end_date', dateString);

        if (subError) throw subError;
        if (!subscriptions || subscriptions.length === 0) {
            return new Response(JSON.stringify({ success: true, message: 'No subscriptions due for renewal.' }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        console.log(`Found ${subscriptions.length} subscriptions to process.`);

        const results = [];

        for (const sub of subscriptions) {
            try {
                console.log(`Processing renewal for sub ${sub.id} (Agreement: ${sub.mobilepay_agreement_id})`);

                // 2. Create a charge via mobilepay-api-proxy (internal call)
                // Or call MobilePay API directly if we have privileges.
                // Let's call the proxy to keep logic centralized.

                const amountInMinorUnits = Math.round(sub.price * 100);

                const response = await fetch(`${supabaseUrl}/functions/v1/mobilepay-api-proxy`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'createCharge',
                        payload: {
                            agreementId: sub.mobilepay_agreement_id,
                            amount: amountInMinorUnits,
                            currency: 'DKK', // Should be dynamic ideally
                            description: `Renewal for ${sub.product_name}`,
                            externalId: `renewal-${sub.id}-${Date.now()}`,
                        },
                    }),
                });

                const chargeResult = await response.json();

                if (!response.ok || !chargeResult.success) {
                    throw new Error(chargeResult.error || 'Failed to create MobilePay charge');
                }

                // 3. Log the renewal attempt
                await supabase.from('activity_logs').insert({
                    action: 'subscription_renewal_initiated',
                    entity_type: 'subscription',
                    entity_id: sub.id,
                    details: { chargeId: chargeResult.data?.id, amount: sub.price },
                });

                results.push({ id: sub.id, status: 'success', chargeId: chargeResult.data?.id });
            } catch (err) {
                console.error(`Error renewing subscription ${sub.id}:`, err.message);
                results.push({ id: sub.id, status: 'error', error: err.message });

                // Log the error
                await supabase.from('logs').insert({
                    level: 'ERROR',
                    message: `Subscription renewal failed for ${sub.id}`,
                    function_name: 'mobilepay-subscription-renewal',
                    context: { error: err.message }
                });
            }
        }

        return new Response(JSON.stringify({ success: true, processed: results }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });

    } catch (error) {
        console.error('Renewal job error:', error.message);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }
});
