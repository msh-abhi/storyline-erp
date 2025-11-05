import { corsHeaders } from '../_shared/cors.ts';

interface Subscription {
  id: string;
  customer_id: string;
  customer_name: string;
  product_name: string;
  end_date: string;
  reminder_10_sent: boolean;
  reminder_5_sent: boolean;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  trigger: string;
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

    // Get email templates for reminders
    const templatesResponse = await fetch(`${supabaseUrl}/rest/v1/email_templates?trigger=in.(subscription_10_day_reminder,subscription_5_day_reminder)&select=*`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });

    if (!templatesResponse.ok) {
      throw new Error('Failed to fetch email templates');
    }

    const templates: EmailTemplate[] = await templatesResponse.json();
    const templatesByTrigger = templates.reduce((acc, template) => {
      acc[template.trigger] = template;
      return acc;
    }, {} as Record<string, EmailTemplate>);

    // Get subscriptions that need reminders
    const subscriptionsResponse = await fetch(`${supabaseUrl}/rest/v1/subscriptions?status=eq.active&select=*`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });

    if (!subscriptionsResponse.ok) {
      throw new Error('Failed to fetch subscriptions');
    }

    const subscriptions: Subscription[] = await subscriptionsResponse.json();
    const now = new Date();
    const remindersProcessed = [];

    for (const subscription of subscriptions) {
      const endDate = new Date(subscription.end_date);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Get customer details
      const customerResponse = await fetch(`${supabaseUrl}/rest/v1/customers?id=eq.${subscription.customer_id}&select=*`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      });

      if (!customerResponse.ok) continue;

      const customers: Customer[] = await customerResponse.json();
      if (customers.length === 0) continue;

      const customer = customers[0];

      // Send 10-day reminder
      if (daysUntilExpiry <= 10 && daysUntilExpiry > 5 && !subscription.reminder_10_sent) {
        const template = templatesByTrigger['subscription_10_day_reminder'];
        if (template) {
          await sendReminderEmail(customer, subscription, 10, template);
        } else {
          console.warn(`10-day reminder template not found for subscription ${subscription.id}`);
        }
        
        // Update subscription to mark reminder as sent
        await fetch(`${supabaseUrl}/rest/v1/subscriptions?id=eq.${subscription.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reminder_10_sent: true })
        });

        remindersProcessed.push({ type: '10-day', customer: customer.name, product: subscription.product_name });
      }

      // Send 5-day reminder
      if (daysUntilExpiry <= 5 && daysUntilExpiry > 0 && !subscription.reminder_5_sent) {
        const template = templatesByTrigger['subscription_5_day_reminder'];
        if (template) {
          await sendReminderEmail(customer, subscription, 5, template);
        } else {
          console.warn(`5-day reminder template not found for subscription ${subscription.id}`);
        }
        
        // Update subscription to mark reminder as sent
        await fetch(`${supabaseUrl}/rest/v1/subscriptions?id=eq.${subscription.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reminder_5_sent: true })
        });

        remindersProcessed.push({ type: '5-day', customer: customer.name, product: subscription.product_name });
      }

      // Mark as expired if past end date
      if (daysUntilExpiry <= 0) {
        await fetch(`${supabaseUrl}/rest/v1/subscriptions?id=eq.${subscription.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'expired' })
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${remindersProcessed.length} reminders`,
        reminders: remindersProcessed
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Subscription reminder error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to process subscription reminders' 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});

async function sendReminderEmail(customer: Customer, subscription: Subscription, daysLeft: number, template: EmailTemplate) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  
  // Replace placeholders in template content
  let content = template.content;
  const templateData = {
    name: customer.name,
    product_name: subscription.product_name,
    end_date: new Date(subscription.end_date).toLocaleDateString(),
    days_left: daysLeft.toString(),
    email: customer.email
  };

  // Replace template placeholders
  Object.entries(templateData).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    content = content.replace(new RegExp(placeholder, 'g'), value);
  });

  const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: customer.email,
      subject: template.subject,
      content,
      templateData
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to send email: ${response.status} - ${errorData}`);
  }

  return await response.json();
}