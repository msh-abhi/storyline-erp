import { Customer, CustomerCredential } from '../types';
import EmailDeliveryService from './emailDeliveryService';

/**
 * Service for sending IPTV credential emails to customers
 */
export class CredentialEmailService {
  
  /**
   * Send credential notification email to customer
   */
  static async sendCredentialEmail(
    customer: Customer, 
    credential: CustomerCredential, 
    action: 'created' | 'updated' | 'deleted' = 'created'
  ): Promise<{ success: boolean; error?: string }> {
    
    try {
      console.log(`Sending ${action} credential email to:`, customer.email);
      
      const emailData = this.generateEmailContent(customer, credential, action);
      
      const result = await EmailDeliveryService.sendEmail({
        to: customer.email,
        subject: emailData.subject,
        html: emailData.html,
        templateData: {
          name: customer.name,
          serverUrl: credential.server_url,
          serverId: credential.server_id,
          password: credential.password,
          macAddress: credential.mac_address,
          expiresAt: credential.expires_at,
          notes: credential.notes,
          action
        }
      });

      if (result.success) {
        console.log(`✅ Credential email sent successfully to ${customer.email}`);
        return { success: true };
      } else {
        console.error(`❌ Failed to send credential email to ${customer.email}:`, result.error);
        return { 
          success: false, 
          error: result.error || 'Unknown email service error' 
        };
      }
      
    } catch (error) {
      console.error(`❌ Exception sending credential email to ${customer.email}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate email content for credential notifications
   */
  private static generateEmailContent(
    customer: Customer,
    credential: CustomerCredential,
    action: 'created' | 'updated' | 'deleted'
  ) {
    
    const actionText = {
      created: 'Dine IPTV-oplysninger er klar',
      updated: 'Dine IPTV-oplysninger er opdateret',
      deleted: 'Dine IPTV-oplysninger er fjernet'
    }[action];

    const isDeleted = action === 'deleted';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dine IPTV-oplysninger</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; background-color: #f4f4f4; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" style="max-width: 600px; width: 100%; background-color: white; border-radius: 10px;">
                <!-- Header -->
                <tr>
                  <td style="padding: 30px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">${isDeleted ? 'Oplysninger Fjernet' : 'Dine IPTV-oplysninger'}</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">Hej ${customer.name},</h2>
                    <p style="line-height: 1.6; color: #333; font-size: 16px; margin-bottom: 20px;">
                      ${actionText}. ${isDeleted ? 'Hvis du tror dette er en fejl, kontakt venligst support.' : 'Her er dine forbindelsesoplysninger. Gem dem sikkert.'}
                    </p>
                    
                    ${!isDeleted ? `
                    <!-- Credential Box -->
                    <div style="background-color: #f8f9fa; border: 2px solid #667eea; padding: 25px; border-radius: 8px; margin: 20px 0;">
                      <h3 style="color: #667eea; margin-top: 0;">Forbindelsesoplysninger:</h3>
                      
                      <div style="margin: 15px 0;">
                        <strong>Server URL:</strong><br>
                        <span style="font-family: monospace; background-color: #e9ecef; padding: 5px; border-radius: 3px;">${credential.server_url}</span>
                      </div>
                      
                      <div style="margin: 15px 0;">
                        <strong>Server ID:</strong><br>
                        <span style="font-family: monospace; background-color: #e9ecef; padding: 5px; border-radius: 3px;">${credential.server_id}</span>
                      </div>
                      
                      ${credential.password ? `
                      <div style="margin: 15px 0;">
                        <strong>Adgangskode:</strong><br>
                        <span style="font-family: monospace; background-color: #e9ecef; padding: 5px; border-radius: 3px;">${credential.password}</span>
                      </div>
                      ` : ''}
                      
                      ${credential.mac_address ? `
                      <div style="margin: 15px 0;">
                        <strong>MAC-adresse:</strong><br>
                        <span style="font-family: monospace; background-color: #e9ecef; padding: 5px; border-radius: 3px;">${credential.mac_address}</span>
                      </div>
                      ` : ''}
                    </div>
                    
                    ${credential.expires_at ? `
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                      <strong>⏰ Udløbsdato:</strong> ${new Date(credential.expires_at).toLocaleDateString('da-DK', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    ` : ''}
                    
                    ${credential.notes ? `
                    <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                      <h4 style="margin-top: 0;">📝 Vigtige bemærkninger:</h4>
                      <p>${credential.notes}</p>
                    </div>
                    ` : ''}
                    ` : ''}
                    
                    <!-- Support Information -->
                    <div style="margin: 30px 0;">
                      <h3 style="color: #667eea;">Har du brug for hjælp?</h3>
                      <p>Hvis du har problemer med opsætningen, er du velkommen til at kontakte os:</p>
                      <p style="margin: 5px 0;">📧 E-mail: kontakt@jysk-streaming.fun</p>
                      <p style="margin: 5px 0;">💬 WhatsApp: +45 91624906</p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 10px 10px; text-align: center;">
                    <p style="margin: 0; color: #666; font-size: 14px;">
                      <strong>Jysk-Streaming</strong>
                    </p>
                    <p style="margin: 10px 0; color: #666; font-size: 14px;">
                      Dette er en automatiseret meddelelse. Besvar venligst ikke denne e-mail, medmindre du har brug for support.
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

    const subject = isDeleted
      ? `IPTV-oplysninger fjernet - ${customer.name}`
      : `Dine IPTV-oplysninger - Jysk-Streaming`;

    return { subject, html };
  }

  /**
   * Send email to multiple customers (bulk operations)
   */
  static async sendBulkCredentialEmails(
    customers: Customer[],
    credentials: CustomerCredential[],
    action: 'created' | 'updated' | 'deleted' = 'created'
  ): Promise<{ success: number; failed: Array<{ customer: Customer; error: string }> }> {
    
    let success = 0;
    const failed: Array<{ customer: Customer; error: string }> = [];

    console.log(`Starting bulk email sending for ${customers.length} customers`);

    // Create a map for quick credential lookup
    const credentialMap = new Map(credentials.map(c => [c.customer_id, c]));

    for (const customer of customers) {
      try {
        const credential = credentialMap.get(customer.id);
        
        if (credential) {
          const result = await this.sendCredentialEmail(customer, credential, action);
          if (result.success) {
            success++;
          } else {
            failed.push({ customer, error: result.error || 'Unknown error' });
          }
        } else {
          failed.push({ customer, error: 'No credential found for customer' });
        }
      } catch (error) {
        failed.push({ 
          customer, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    console.log(`Bulk email sending completed: ${success} successful, ${failed.length} failed`);
    
    return { success, failed };
  }
}

export default CredentialEmailService;