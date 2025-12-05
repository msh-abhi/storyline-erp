// Centralized email delivery service using Supabase Edge Function
export class EmailDeliveryService {

  // Main email sending function using the send-email Edge Function
  // The Edge Function has the Brevo API key securely configured via environment variables
  static async sendEmail(emailData: {
    to: string;
    subject: string;
    html: string;
    fromEmail?: string;
    fromName?: string;
    templateData?: Record<string, any>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {

    try {
      console.log('🚀 Sending email via Edge Function for:', emailData.to);

      // Get Supabase URL and anon key from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing. Please check your environment variables.');
      }

      // Use provided sender details or fallback to defaults
      const finalSenderName = emailData.fromName || 'Jysk Streaming';
      const finalSenderEmail = emailData.fromEmail || 'kontakt@jysk-streaming.fun';

      // Prepare request payload for the Edge Function
      const requestPayload = {
        to: emailData.to,
        subject: emailData.subject,
        content: emailData.html,
        templateData: emailData.templateData || {},
        senderName: finalSenderName,
        senderEmail: finalSenderEmail
      };

      // Send email via the Edge Function (Brevo API key is securely stored as Deno env variable)
      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(requestPayload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Edge Function error: ${response.status}`);
      }

      console.log('✅ Email sent successfully via Edge Function:', result);

      return {
        success: true,
        messageId: result.messageId || `edge-${Date.now()}`
      };

    } catch (error) {
      console.error('💥 Failed to send email via Edge Function:', error);
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
