import { supabase } from '../lib/supabase';
import { emailTemplateService } from './supabaseService';
import { EmailTemplate, Customer } from '../types';
import { EmailDeliveryService } from './emailDeliveryService';

// Welcome email automation service
export const welcomeEmailService = {
  // Check if welcome emails are enabled in settings
  async isWelcomeEmailEnabled(): Promise<boolean> {
    try {
      // Try to get the latest settings record using a single query first
      const { data: settings, error } = await supabase
        .from('settings')
        .select('welcome_email_enabled')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.warn('Error fetching welcome email settings:', error);
        return false;
      }

      const isEnabled = settings?.welcome_email_enabled ?? false;
      console.log('Welcome email enabled check:', {
        settings,
        welcome_email_enabled: settings?.welcome_email_enabled,
        isEnabled,
        queryMethod: 'single',
        timestamp: new Date().toISOString()
      });
      return isEnabled;
    } catch (error) {
      console.warn('Error checking welcome email settings:', error);
      return false; // Default to disabled if settings can't be loaded
    }
  },

  // Get the welcome email template
  async getWelcomeEmailTemplate(): Promise<EmailTemplate | null> {
    try {
      const { data: settings } = await supabase
        .from('settings')
        .select('welcome_email_template_id')
        .single();
      
      if (!settings?.welcome_email_template_id) {
        // Fallback to any template with 'new_customer' trigger
        const templates = await emailTemplateService.getAll();
        return templates.find(t => t.trigger === 'new_customer') || null;
      }
      
      const templates = await emailTemplateService.getAll();
      return templates.find(t => t.id === settings.welcome_email_template_id) || null;
    } catch (error) {
      console.error('Error getting welcome email template:', error);
      return null;
    }
  },

  // Send welcome email to a newly created customer
  async sendWelcomeEmail(customer: Customer): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      // Check if welcome emails are enabled
      const isEnabled = await this.isWelcomeEmailEnabled();
      if (!isEnabled) {
        console.log('Welcome email is disabled, skipping...');
        return { success: true, note: 'Welcome email automation is disabled.' } as any;
      }

      // Get the welcome email template
      const template = await this.getWelcomeEmailTemplate();
      if (!template) {
        console.warn('No welcome email template found');
        return { success: false, error: 'Welcome email template not configured' };
      }

      // Prepare template data
      const templateData = {
        name: customer.name,
        email: customer.email,
        date: new Date().toLocaleDateString(),
        company: 'StoryLine ERP',
        customer_id: customer.id,
        phone: customer.phone || '',
        address: customer.address || '',
      };
      
      const emailHtml = this.createHtmlEmail(template, templateData);
      const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (match, key) => (templateData as any)[key] || match);

      // Get sender info from settings
      const { data: settings } = await supabase
        .from('settings')
        .select('emailSettings')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      const senderEmail = settings?.emailSettings?.senderEmail || 'kontakt@jysk-streaming.fun';
      const senderName = settings?.emailSettings?.senderName || 'StoryLine ERP';

      console.log(`🚀 Calling EmailDeliveryService for ${customer.email}`);

      // Use the centralized EmailDeliveryService
      const emailResult = await EmailDeliveryService.sendEmail({
        to: customer.email,
        subject: subject,
        html: emailHtml,
        fromEmail: senderEmail,
        fromName: senderName,
        templateData: templateData
      });

      if (emailResult.success) {
        await this.logWelcomeEmailSent(customer.id, template.id, emailResult.messageId);
      }

      return emailResult;

    } catch (error) {
      console.error('💥 Unexpected error in sendWelcomeEmail:', error);
      return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred.' };
    }
  },

  // Helper: Create professional HTML email
  createHtmlEmail(template: EmailTemplate, templateData: Record<string, string>): string {
    const processedContent = template.content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return templateData[key] || match;
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${template.subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; background-color: #f4f4f4; padding: 20px 0;">
            <tr>
              <td align="center">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 30px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px 10px 0 0;">
                      <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold; text-align: center;">
                        ${templateData.company || 'StoryLine ERP'}
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <div style="line-height: 1.6; color: #333; font-size: 16px;">
                        ${processedContent.replace(/\n/g, '<br><br>')}
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 10px 10px; text-align: center;">
                      <p style="margin: 0; color: #666; font-size: 14px;">
                        <strong>Best regards,<br>
                        ${templateData.company || 'StoryLine ERP'} Team</strong><br>
                        <a href="mailto:kontakt@jysk-streaming.fun" style="color: #667eea; text-decoration: none;">
                          kontakt@jysk-streaming.fun
                        </a>
                      </p>
                      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                      <p style="margin: 0; color: #999; font-size: 12px;">
                        This email was sent to ${templateData.email} as part of our welcome process.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  },

  // Log welcome email sending for tracking and analytics
  async logWelcomeEmailSent(customerId: string, templateId: string, messageId?: string) {
    try {
      await supabase
        .from('welcome_email_logs')
        .insert({
          customer_id: customerId,
          template_id: templateId,
          message_id: messageId || null,
          sent_at: new Date().toISOString(),
          status: 'sent'
        });
    } catch (error) {
      console.error('Error logging welcome email:', error);
      // Don't throw here, as this is just logging
    }
  },

  // Get welcome email sending statistics
  async getWelcomeEmailStats() {
    try {
      const { data, error } = await supabase
        .from('welcome_email_logs')
        .select(`
          id,
          status,
          sent_at,
          customers (
            id,
            name,
            email
          ),
          email_templates (
            id,
            name
          )
        `)
        .order('sent_at', { ascending: false });
      
      if (error) throw error;
      
      const totalSent = data.length;
      const thisMonth = data.filter(log => {
        const sentDate = new Date(log.sent_at);
        const now = new Date();
        return sentDate.getMonth() === now.getMonth() && 
               sentDate.getFullYear() === now.getFullYear();
      }).length;

      return {
        totalSent,
        thisMonth,
        recentLogs: data.slice(0, 10) // Last 10 emails
      };
    } catch (error) {
      console.error('Error getting welcome email stats:', error);
      return {
        totalSent: 0,
        thisMonth: 0,
        recentLogs: []
      };
    }
  }
};

// Database trigger function for automatic welcome emails
export const createWelcomeEmailTrigger = async () => {
  try {
    // Create the welcome_email_logs table if it doesn't exist
    const { error: tableError } = await supabase.rpc('create_welcome_email_logs_table');
    if (tableError) {
      console.warn('Could not create welcome_email_logs table:', tableError);
    }

    // Create a function to automatically send welcome emails
    const { error: functionError } = await supabase.rpc('create_send_welcome_email_function');
    if (functionError) {
      console.warn('Could not create welcome email function:', functionError);
    }

    console.log('Welcome email automation setup completed');
  } catch (error) {
    console.error('Error setting up welcome email automation:', error);
  }
};

// Helper function to trigger welcome email from anywhere in the app
export const triggerWelcomeEmail = async (customer: Customer) => {
  const result = await welcomeEmailService.sendWelcomeEmail(customer);
  if (result.success) {
    // Check if the email was actually sent or just skipped
    const isEnabled = await welcomeEmailService.isWelcomeEmailEnabled();
    if (isEnabled) {
      console.log(`Welcome email sent successfully for customer: ${customer.email}`);
    } else {
      console.log(`Welcome email trigger skipped for customer ${customer.email} because the feature is disabled.`);
    }
  } else {
    console.warn(`Failed to send welcome email for customer ${customer.email}:`, result.error);
  }
  return result;
};
