import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Mail, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EmailTemplate } from '../types';
import ReminderTemplateManager from './ReminderTemplateManager';

export default function EmailTemplateManagement() {
  const { state, actions } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showSendForm, setShowSendForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    trigger: 'manual'
  });
  const [sendFormData, setSendFormData] = useState({
    recipientType: 'customer' as 'customer' | 'reseller' | 'custom',
    recipientId: '',
    customEmail: '',
    customName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const templateData: Omit<EmailTemplate, 'id'> = {
        name: formData.name,
        subject: formData.subject,
        content: formData.content,
        trigger: formData.trigger
      };

      if (editingTemplate) {
        await actions.updateEmailTemplate(editingTemplate.id, templateData);
      } else {
        await actions.createEmailTemplate(templateData);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving email template:', error);
      alert('Failed to save email template. Please try again.');
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTemplate) return;

    try {
      let recipientEmail = '';
      let recipientName = '';

      if (sendFormData.recipientType === 'custom') {
        recipientEmail = sendFormData.customEmail;
        recipientName = sendFormData.customName;
      } else {
        const recipients = sendFormData.recipientType === 'customer' ? state.customers : state.resellers;
        const recipient = recipients.find(r => r.id === sendFormData.recipientId);
        if (recipient) {
          recipientEmail = recipient.email;
          recipientName = recipient.name;
        }
      }

      if (!recipientEmail) {
        alert('Please select a valid recipient');
        return;
      }

      await actions.sendEmail(
        recipientEmail,
        selectedTemplate.subject,
        selectedTemplate.content,
        { name: recipientName, email: recipientEmail }
      );

      alert('Email sent successfully!');
      resetSendForm();
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', subject: '', content: '', trigger: 'manual' });
    setShowForm(false);
    setEditingTemplate(null);
  };

  const resetSendForm = () => {
    setSendFormData({
      recipientType: 'customer',
      recipientId: '',
      customEmail: '',
      customName: ''
    });
    setShowSendForm(false);
    setSelectedTemplate(null);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      content: template.content,
      trigger: template.trigger
    });
    setShowForm(true);
  };

  const handleSendTest = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setShowSendForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this email template?')) {
      try {
        await actions.deleteEmailTemplate(id);
      } catch (error) {
        console.error('Error deleting email template:', error);
        alert('Failed to delete email template. Please try again.');
      }
    }
  };

  // Create default templates if none exist
  React.useEffect(() => {
    const createDefaultTemplates = async () => {
      // Check if reminder templates exist
      const has10DayReminder = state.emailTemplates.some(t => t.trigger === 'subscription_10_day_reminder');
      const has5DayReminder = state.emailTemplates.some(t => t.trigger === 'subscription_5_day_reminder');
      const hasWelcomeTemplate = state.emailTemplates.some(t => t.trigger === 'new_customer');
      
      try {
        // Create 10-day reminder template if it doesn't exist
        if (!has10DayReminder) {
          await actions.createEmailTemplate({
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
          });
        }

        // Create 5-day reminder template if it doesn't exist
        if (!has5DayReminder) {
          await actions.createEmailTemplate({
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
          });
        }

        // Create welcome template if it doesn't exist and no templates exist at all
        if (!hasWelcomeTemplate && state.emailTemplates.length === 0) {
          await actions.createEmailTemplate({
            name: 'Welcome New Customer',
            subject: 'Welcome to {{company}} - {{name}}',
            trigger: 'new_customer',
            content: `Dear {{name}},

Welcome to {{company}}! We're excited to have you as our customer.

Your account has been successfully created with the following details:
- Email: {{email}}
- Registration Date: {{date}}

What's next?
1. Explore our services
2. Contact us if you have any questions
3. Follow us on social media for updates

If you need any assistance, our support team is here to help.

Best regards,
{{company}} Team`
          });
        }
      } catch (error) {
        console.error('Error creating default templates:', error);
      }
    };

    createDefaultTemplates();
  }, [state.emailTemplates, actions]);

  // Legacy effect for backward compatibility - remove after templates are created
  React.useEffect(() => {
    const createLegacyDefaultTemplates = async () => {
      if (state.emailTemplates.length === 0) {
        try {
          // 10-day reminder template
          await actions.createEmailTemplate({
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
          });

          // 5-day reminder template
          await actions.createEmailTemplate({
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
          });

          // Welcome template
          await actions.createEmailTemplate({
            name: 'Welcome New Customer',
            subject: 'Welcome to {{company}} - {{name}}',
            trigger: 'new_customer',
            content: `Dear {{name}},

Welcome to {{company}}! We're excited to have you as our customer.

Your account has been successfully created with the following details:
- Email: {{email}}
- Registration Date: {{date}}

What's next?
1. Explore our services
2. Contact us if you have any questions
3. Follow us on social media for updates

If you need any assistance, our support team is here to help.

Best regards,
{{company}} Team`
          });
        } catch (error) {
          console.error('Error creating default templates:', error);
        }
      }
    };

    // Only run this if no templates exist at all (legacy support)
    if (state.emailTemplates.length === 0) {
      createLegacyDefaultTemplates();
    }
  }, [state.emailTemplates.length, actions]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Email Templates</h2>
          <p className="text-gray-600 mt-2">Create and manage email templates with Brevo integration</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Template</span>
        </button>
      </div>

      {/* Reminder Template Manager */}
      <ReminderTemplateManager />

      {/* Add/Edit Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingTemplate ? 'Edit Email Template' : 'Create New Email Template'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Welcome Email, Follow-up"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email subject line"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trigger *
                </label>
                <select
                  value={formData.trigger}
                  onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="manual">Manual Send</option>
                  <option value="new_customer">New Customer Registration</option>
                  <option value="purchase">After Purchase</option>
                  <option value="subscription_10_day_reminder">10-Day Subscription Reminder</option>
                  <option value="subscription_5_day_reminder">5-Day Subscription Reminder</option>
                  <option value="follow_up">Follow-up (7 days)</option>
                  <option value="monthly">Monthly Newsletter</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Content *
                </label>
                <textarea
                  required
                  rows={8}
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Write your email content here... You can use {{name}}, {{email}}, and other placeholders."
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Available Placeholders:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><code className="bg-gray-200 px-1 rounded">{'{{name}}'}</code> - Customer name</p>
                  <p><code className="bg-gray-200 px-1 rounded">{'{{email}}'}</code> - Customer email</p>
                  <p><code className="bg-gray-200 px-1 rounded">{'{{date}}'}</code> - Current date</p>
                  <p><code className="bg-gray-200 px-1 rounded">{'{{company}}'}</code> - Your company name</p>
                  <p><code className="bg-gray-200 px-1 rounded">{'{{product_name}}'}</code> - Product/subscription name</p>
                  <p><code className="bg-gray-200 px-1 rounded">{'{{end_date}}'}</code> - Subscription end date</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTemplate ? 'Update' : 'Create'} Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Email Form */}
      {showSendForm && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Send Email: {selectedTemplate.name}
            </h3>
            
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Type *
                </label>
                <select
                  value={sendFormData.recipientType}
                  onChange={(e) => setSendFormData(prev => ({ 
                    ...prev, 
                    recipientType: e.target.value as 'customer' | 'reseller' | 'custom',
                    recipientId: '',
                    customEmail: '',
                    customName: ''
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="customer">Customer</option>
                  <option value="reseller">Reseller</option>
                  <option value="custom">Custom Email</option>
                </select>
              </div>

              {sendFormData.recipientType !== 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select {sendFormData.recipientType} *
                  </label>
                  <select
                    required
                    value={sendFormData.recipientId}
                    onChange={(e) => setSendFormData(prev => ({ ...prev, recipientId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a {sendFormData.recipientType}</option>
                    {(sendFormData.recipientType === 'customer' ? state.customers : state.resellers).map((recipient) => (
                      <option key={recipient.id} value={recipient.id}>
                        {recipient.name} ({recipient.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {sendFormData.recipientType === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={sendFormData.customEmail}
                      onChange={(e) => setSendFormData(prev => ({ ...prev, customEmail: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="recipient@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={sendFormData.customName}
                      onChange={(e) => setSendFormData(prev => ({ ...prev, customName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Recipient name"
                    />
                  </div>
                </>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Email Preview:</h4>
                <p className="text-sm font-medium text-gray-700">Subject: {selectedTemplate.subject}</p>
                <div className="text-sm text-gray-600 mt-2 max-h-32 overflow-y-auto">
                  {selectedTemplate.content}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetSendForm}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Send Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.emailTemplates.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white rounded-lg border border-gray-200">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No email templates found. Create your first template to get started.</p>
          </div>
        ) : (
          state.emailTemplates.map((template) => (
            <div key={template.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{template.subject}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(template)}
                    className="text-blue-600 hover:text-blue-700 p-1"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleSendTest(template)}
                    className="text-green-600 hover:text-green-700 p-1"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {template.trigger.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <p className="line-clamp-3">{template.content}</p>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={() => handleSendTest(template)}
                  className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                >
                  Send Email
                </button>
                <p className="text-xs text-gray-500">
                  {template.content.length} characters
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}