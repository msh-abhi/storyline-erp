import React, { useState, useEffect } from 'react';
import { Mail, Settings, BarChart3, ToggleLeft, ToggleRight, Save, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { welcomeEmailService } from '../services/welcomeEmailService';
import { EmailTemplate } from '../types';

interface WelcomeEmailSettings {
  welcomeEmailEnabled: boolean;
  welcomeEmailTemplateId: string;
}

export default function WelcomeEmailManager() {
  const { state, actions } = useApp();
  const [settings, setSettings] = useState<WelcomeEmailSettings>({
    welcomeEmailEnabled: false,
    welcomeEmailTemplateId: ''
  });
  const [stats, setStats] = useState({
    totalSent: 0,
    thisMonth: 0,
    recentLogs: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      const isEnabled = await welcomeEmailService.isWelcomeEmailEnabled();
      const template = await welcomeEmailService.getWelcomeEmailTemplate();

      setSettings({
        welcomeEmailEnabled: isEnabled,
        welcomeEmailTemplateId: template?.id || ''
      });
    } catch (error) {
      console.error('Error loading welcome email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await welcomeEmailService.getWelcomeEmailStats();
      setStats(statsData as any);
    } catch (error) {
      console.error('Error loading welcome email stats:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      if (state.settings?.id) {
        await actions.updateSettings(state.settings.id, {
          welcomeEmailEnabled: settings.welcomeEmailEnabled,
          welcomeEmailTemplateId: settings.welcomeEmailTemplateId || undefined
        });
        alert('Welcome email settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving welcome email settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    setTestingEmail(true);
    try {
      const template = state.emailTemplates.find(t => t.id === settings.welcomeEmailTemplateId);
      if (!template) {
        alert('Please select a welcome email template first.');
        return;
      }

      const testEmail = prompt('Enter email address to send test welcome email:');
      if (!testEmail) return;

      // Use the welcome email service to send a test email
      const testCustomer = {
        id: 'test-customer',
        name: 'Test Customer',
        email: testEmail,
        phone: '',
        address: '',
        city: '',
        country: '',
        postalCode: '',
        whatsappNumber: '',
        macAddress: '',
        user_id: '',
        status: 'active' as const,
        customFields: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await welcomeEmailService.sendWelcomeEmail(testCustomer);
      if (result.success) {
        alert('Test welcome email sent successfully!');
      } else {
        alert(`Failed to send test email: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Failed to send test email. Please try again.');
    } finally {
      setTestingEmail(false);
    }
  };

  const toggleWelcomeEmail = () => {
    setSettings(prev => ({
      ...prev,
      welcomeEmailEnabled: !prev.welcomeEmailEnabled
    }));
  };

  const welcomeEmailTemplates: EmailTemplate[] = state.emailTemplates.filter((t: EmailTemplate) => t.trigger === 'new_customer');

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading welcome email settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome Email Manager</h2>
              <p className="text-gray-600">Automatically send welcome emails to new customers</p>
            </div>
          </div>
          <button
            onClick={toggleWelcomeEmail}
            className="flex items-center space-x-2"
          >
            {settings.welcomeEmailEnabled ? (
              <>
                <ToggleRight className="h-8 w-8 text-green-600" />
                <span className="text-green-600 font-medium">Enabled</span>
              </>
            ) : (
              <>
                <ToggleLeft className="h-8 w-8 text-gray-400" />
                <span className="text-gray-400 font-medium">Disabled</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Emails Sent</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalSent}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-3xl font-bold text-green-600">{stats.thisMonth}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Status</p>
              <p className={`text-3xl font-bold ${settings.welcomeEmailEnabled ? 'text-green-600' : 'text-red-600'}`}>
                {settings.welcomeEmailEnabled ? 'ON' : 'OFF'}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${settings.welcomeEmailEnabled ? 'bg-green-50' : 'bg-red-50'}`}>
              <Settings className={`h-6 w-6 ${settings.welcomeEmailEnabled ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Configuration</h3>

        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Welcome Email Automation</h4>
              <p className="text-sm text-gray-600">
                Automatically send welcome emails when new customers are created
              </p>
            </div>
            <button
              onClick={toggleWelcomeEmail}
              className={`p-2 rounded-lg transition-colors ${settings.welcomeEmailEnabled
                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
            >
              {settings.welcomeEmailEnabled ? (
                <ToggleRight className="h-6 w-6" />
              ) : (
                <ToggleLeft className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Template Selection */}
          {settings.welcomeEmailEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Email Template *
                </label>
                <select
                  value={settings.welcomeEmailTemplateId}
                  onChange={(e) => setSettings(prev => ({ ...prev, welcomeEmailTemplateId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a welcome email template</option>
                  {welcomeEmailTemplates.map((template: EmailTemplate) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {welcomeEmailTemplates.length === 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    No welcome email templates found. Please create one in Email Templates section.
                  </p>
                )}
              </div>

              {settings.welcomeEmailTemplateId && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Template Preview</h4>
                  {(() => {
                    const template = state.emailTemplates.find((t: EmailTemplate) => t.id === settings.welcomeEmailTemplateId);
                    return template ? (
                      <div className="space-y-2">
                        <p><strong>Subject:</strong> {template.subject}</p>
                        <p className="text-sm text-gray-600 line-clamp-3">{template.content}</p>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={sendTestEmail}
              disabled={!settings.welcomeEmailEnabled || !settings.welcomeEmailTemplateId || testingEmail}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>{testingEmail ? 'Sending...' : 'Send Test Email'}</span>
            </button>

            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Email Logs */}
      {stats.recentLogs.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Welcome Emails</h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(stats.recentLogs as any[]).map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {log.customers?.name || 'Unknown Customer'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.customers?.email || 'No email'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.email_templates?.name || 'Unknown Template'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(log.sent_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${log.status === 'sent'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}