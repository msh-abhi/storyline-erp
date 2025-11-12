import { supabase } from '../lib/supabase';

// Centralized email delivery service using Brevo API directly
export class EmailDeliveryService {

  // Main email sending function using Brevo API directly
  static async sendEmail(emailData: {
    to: string;
    subject: string;
    html: string;
    fromEmail?: string;
    fromName?: string;
    templateData?: Record<string, any>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {

    try {
      console.log('🚀 Sending email via Brevo API for:', emailData.to);

      // Get Brevo API key from settings or environment variables
      const { data: settings } = await supabase
        .from('settings')
        .select('emailSettings')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let brevoApiKey = settings?.emailSettings?.brevoApiKey;

      // Fallback to environment variables if not in settings
      if (!brevoApiKey) {
        brevoApiKey = import.meta.env.VITE_BREVO_API_KEY || import.meta.env.VITE_SENDINBLUE_API_KEY;
      }

      if (!brevoApiKey) {
        throw new Error('Brevo API key not configured. Please add it to Settings > Email Settings or environment variables.');
      }

      // Use provided sender details or fallback to defaults
      const finalSenderName = emailData.fromName || 'StoryLine ERP';
      const finalSenderEmail = emailData.fromEmail || 'kontakt@jysk-streaming.fun';

      // Prepare email data for Brevo API
      const emailPayload = {
        sender: {
          name: finalSenderName,
          email: finalSenderEmail
        },
        to: [
          {
            email: emailData.to,
            name: emailData.templateData?.name || emailData.to
          }
        ],
        subject: emailData.subject,
        htmlContent: emailData.html
      };

      // Send email via Brevo API
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': brevoApiKey
        },
        body: JSON.stringify(emailPayload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Brevo API error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log('✅ Email sent successfully via Brevo API:', result);

      return {
        success: true,
        messageId: result.messageId || `brevo-${Date.now()}`
      };

    } catch (error) {
      console.error('💥 Failed to send email via Brevo API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred while sending the email.'
      };
    }
  }

  // Pending emails management (for fallback when API fails)
  private static pendingEmails: any[] = [];

  static getPendingEmails(): any[] {
    return this.pendingEmails;
  }

  static addPendingEmail(email: any): void {
    this.pendingEmails.push({
      ...email,
      timestamp: new Date().toISOString(),
      action: 'pending_manual_send'
    });
  }

  static clearPendingEmails(): void {
    this.pendingEmails = [];
  }
}

export default EmailDeliveryService;
