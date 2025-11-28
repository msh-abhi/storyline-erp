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
      created: 'Your IPTV credentials have been set up',
      updated: 'Your IPTV credentials have been updated',
      deleted: 'Your IPTV credentials have been removed'
    }[action];

    const isDeleted = action === 'deleted';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>IPTV Credentials - ${actionText}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
          }
          .header h1 {
            color: #1e40af;
            margin: 0;
            font-size: 28px;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 20px;
          }
          .credential-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 10px;
            margin: 20px 0;
          }
          .credential-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 15px 0;
          }
          .credential-item {
            background: rgba(255, 255, 255, 0.1);
            padding: 12px;
            border-radius: 8px;
          }
          .credential-label {
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
            opacity: 0.9;
          }
          .credential-value {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            word-break: break-all;
          }
          .password {
            font-family: 'Courier New', monospace;
            background: rgba(0, 0, 0, 0.2);
            padding: 8px 12px;
            border-radius: 6px;
            display: inline-block;
            font-weight: bold;
          }
          .notes {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
          }
          .notes h4 {
            margin: 0 0 8px 0;
            color: #92400e;
          }
          .expiry {
            background: #fee2e2;
            border: 1px solid #fecaca;
            padding: 12px;
            border-radius: 8px;
            margin: 15px 0;
            text-align: center;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 14px;
          }
          .support {
            background: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
          }
          .btn {
            display: inline-block;
            background: #1e40af;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 10px 5px;
          }
          .btn:hover {
            background: #1e3a8a;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isDeleted ? 'Credentials Removed' : 'Your IPTV Credentials'}</h1>
          </div>
          
          <div class="greeting">
            Hello ${customer.name},
          </div>
          
          <p>${actionText} for your IPTV service. Below are your connection details:</p>
          
          ${!isDeleted ? `
          <div class="credential-box">
            <div class="credential-grid">
              <div class="credential-item">
                <div class="credential-label">Server URL</div>
                <div class="credential-value">${credential.server_url}</div>
              </div>
              <div class="credential-item">
                <div class="credential-label">Server ID</div>
                <div class="credential-value">${credential.server_id}</div>
              </div>
              ${credential.password ? `
              <div class="credential-item">
                <div class="credential-label">Password</div>
                <div class="credential-value">
                  <span class="password">${credential.password}</span>
                </div>
              </div>
              ` : ''}
              ${credential.mac_address ? `
              <div class="credential-item">
                <div class="credential-label">MAC Address</div>
                <div class="credential-value">${credential.mac_address}</div>
              </div>
              ` : ''}
            </div>
          </div>
          
          ${credential.expires_at ? `
          <div class="expiry">
            <strong>⏰ Service Expires:</strong> ${new Date(credential.expires_at).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          ` : ''}
          
          ${credential.notes ? `
          <div class="notes">
            <h4>📝 Important Notes:</h4>
            <p>${credential.notes}</p>
          </div>
          ` : ''}
          
          <div class="support">
            <h3>🔧 Setup Instructions</h3>
            <p>Use the server details above in your IPTV application or device settings. If you need help with setup, please don't hesitate to contact our support team.</p>
            
            <a href="mailto:kontakt@jysk-streaming.fun" class="btn">Contact Support</a>
            <a href="https://jysk-streaming.fun" class="btn">Visit Website</a>
          </div>
          ` : `
          <div class="notes">
            <h4>ℹ️ Your IPTV credentials have been removed</h4>
            <p>If you believe this was done in error or you need new credentials, please contact our support team.</p>
          </div>
          `}
          
          <div class="footer">
            <p><strong>Jysk Streaming</strong></p>
            <p>If you have any questions, please reply to this email or contact us at kontakt@jysk-streaming.fun</p>
            <p style="font-size: 12px; margin-top: 20px;">
              This is an automated message. Please do not reply to this email unless you need support.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = isDeleted 
      ? `IPTV Credentials Removed - ${customer.name}`
      : `Your IPTV Credentials - ${credential.server_url}`;

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