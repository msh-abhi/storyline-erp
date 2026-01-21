/**
 * Email Configuration - Centralized sender information for different email types
 * All emails are verified and authenticated in Brevo
 */

export type EmailType = 'welcome' | 'support' | 'system' | 'transactional';

export interface EmailSenderConfig {
  fromEmail: string;
  fromName: string;
}

/**
 * Get the appropriate sender configuration based on email type
 */
export function getEmailSender(type: EmailType): EmailSenderConfig {
  const senderConfigs: Record<EmailType, EmailSenderConfig> = {
    // Welcome emails - warm, friendly greeting
    welcome: {
      fromEmail: 'velkommen@jysk-streaming.fun',
      fromName: 'Velkommen - Jysk Streaming'
    },
    
    // Support-related emails - customer service, help, credentials
    support: {
      fromEmail: 'kontakt@jysk-streaming.fun',
      fromName: '[Support] Jysk-Streaming'
    },
    
    // System/automated emails - reminders, notifications
    system: {
      fromEmail: 'no-reply@jysk-streaming.fun',
      fromName: '[no-reply] Jysk-Streaming'
    },
    
    // Transactional emails - purchases, orders, payments, invoices
    transactional: {
      fromEmail: 'noreply@storyline.help',
      fromName: '[no-reply] Storyline'
    }
  };

  return senderConfigs[type];
}

/**
 * Determine email type based on context/trigger
 */
export function determineEmailType(trigger?: string): EmailType {
  if (!trigger) return 'system';

  // Map triggers to email types
  const triggerMap: Record<string, EmailType> = {
    // Welcome emails
    'new_customer': 'welcome',
    
    // Support emails
    'credentials_created': 'support',
    'credentials_updated': 'support',
    'credentials_deleted': 'support',
    'manual': 'support',
    
    // System emails
    'subscription_10_day_reminder': 'system',
    'subscription_5_day_reminder': 'system',
    'follow_up': 'system',
    'monthly': 'system',
    
    // Transactional emails
    'purchase': 'transactional',
    'order_created': 'transactional',
    'payment_received': 'transactional',
    'invoice_created': 'transactional',
    'subscription_renewed': 'transactional'
  };

  return triggerMap[trigger] || 'system';
}
