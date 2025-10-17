import { Subscription, EmailTemplate } from '../types';

export function getDaysUntilExpiry(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateSubscriptionEndDate(startDate: string, durationMonths: number): string {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + durationMonths);
  return end.toISOString();
}

export function getSubscriptionReminderStatus(subscription: Subscription): {
  daysLeft: number;
  needsReminder: boolean;
  reminderType: '10-day' | '5-day' | 'expired' | 'none';
  isUrgent: boolean;
} {
  const daysLeft = getDaysUntilExpiry(subscription.endDate);
  
  if (daysLeft <= 0) {
    return {
      daysLeft,
      needsReminder: false,
      reminderType: 'expired',
      isUrgent: true
    };
  }
  
  if (daysLeft <= 5 && !subscription.reminder5Sent) {
    return {
      daysLeft,
      needsReminder: true,
      reminderType: '5-day',
      isUrgent: true
    };
  }
  
  if (daysLeft <= 10 && daysLeft > 5 && !subscription.reminder10Sent) {
    return {
      daysLeft,
      needsReminder: true,
      reminderType: '10-day',
      isUrgent: false
    };
  }
  
  return {
    daysLeft,
    needsReminder: false,
    reminderType: 'none',
    isUrgent: false
  };
}

export function getRequiredReminderTemplates(): Array<{
  name: string;
  subject: string;
  trigger: string;
  content: string;
}> {
  return [
    {
      name: '10-Day Subscription Reminder',
      subject: 'Your subscription expires in 10 days - {{name}}',
      trigger: 'subscription_10_day_reminder',
      content: `Dear {{name}},

This is a friendly reminder that your subscription will expire in 10 days.

Subscription Details:
- Service: {{product_name}}
- Expiry Date: {{end_date}}

To continue enjoying our services without interruption, please renew your subscription before the expiry date.

You can renew by:
1. Contacting us directly
2. Visiting our website
3. Calling our support team

If you have any questions or need assistance, please don't hesitate to contact us.

Best regards,
{{company}} Team`
    },
    {
      name: '5-Day Subscription Reminder',
      subject: 'URGENT: Your subscription expires in 5 days - {{name}}',
      trigger: 'subscription_5_day_reminder',
      content: `Dear {{name}},

This is an urgent reminder that your subscription will expire in just 5 days.

Subscription Details:
- Service: {{product_name}}
- Expiry Date: {{end_date}}

To avoid service interruption, please renew your subscription immediately.

You can renew by:
1. Contacting us directly
2. Visiting our website
3. Calling our support team

Don't wait - renew today to continue enjoying uninterrupted service!

Best regards,
{{company}} Team`
    }
  ];
}

export function validateReminderTemplates(templates: EmailTemplate[]): {
  isValid: boolean;
  missing: string[];
  existing: string[];
} {
  const requiredTriggers = ['subscription_10_day_reminder', 'subscription_5_day_reminder'];
  const existingTriggers = templates.map(t => t.trigger);
  
  const missing = requiredTriggers.filter(trigger => !existingTriggers.includes(trigger));
  const existing = requiredTriggers.filter(trigger => existingTriggers.includes(trigger));
  
  return {
    isValid: missing.length === 0,
    missing,
    existing
  };
}