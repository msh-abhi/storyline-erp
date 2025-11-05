import React, { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, RefreshCw, Mail, CreditCard, Globe, Database } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SupportedCurrency } from '../types';
import { getSupportedCurrencies } from '../utils/calculations';
import { validateReminderTemplates } from '../utils/subscriptionUtils';
import DataExport from './DataExport';

export default function SettingsComponent() {
  const { state, actions } = useApp();
  const [formData, setFormData] = useState({
    companyName: '',
    logoUrl: '',
    currency: 'DKK' as SupportedCurrency,
    language: 'en' as 'en' | 'da',
    emailSettings: {
      senderName: '',
      senderEmail: ''
    },
    businessSettings: {
      defaultPaymentMethod: 'Storyline',
      subscriptionAutoRenew: true,
      reminderDays10: true,
      reminderDays5: true,
      allowManualPayments: true,
      requirePrepayment: false
    }
  });
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);

  const supportedCurrencies = getSupportedCurrencies();
  const reminderValidation = validateReminderTemplates(state.emailTemplates);

  useEffect(() => {
    if (state.settings) {
      setFormData({
        companyName: state.settings.companyName || '',
        logoUrl: state.settings.logoUrl || '',
        currency: state.settings.currency as SupportedCurrency || 'DKK',
        language: state.settings.language || 'en',
        emailSettings: {
          senderName: state.settings.emailSettings?.senderName || '',
          senderEmail: state.settings.emailSettings?.senderEmail || ''
        },
        businessSettings: {
          defaultPaymentMethod: state.settings.businessSettings?.defaultPaymentMethod || 'Storyline',
          subscriptionAutoRenew: state.settings.businessSettings?.subscriptionAutoRenew ?? true,
          reminderDays10: state.settings.businessSettings?.reminderDays10 ?? true,
          reminderDays5: state.settings.businessSettings?.reminderDays5 ?? true,
          allowManualPayments: state.settings.businessSettings?.allowManualPayments ?? true,
          requirePrepayment: state.settings.businessSettings?.requirePrepayment ?? false
        }
      });
    }
  }, [state.settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (state.settings) {
        await actions.updateSettings(state.settings.id, formData);
      } else {
        await actions.createSettings(formData);
      }
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    }
  };

  const handleRefreshExchangeRates = async () => {
    setIsRefreshingRates(true);
    try {
      await actions.refreshExchangeRates();
      alert('Exchange rates refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing exchange rates:', error);
      alert('Failed to refresh exchange rates');
    } finally {
      setIsRefreshingRates(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">System Settings</h2>
          <p className="text-gray-600 mt-2">Configure your business settings, operations, and preferences</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Data Export & Backup */}
        <DataExport />

        {/* Application Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            
            {/* Company Information */}
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <SettingsIcon className="h-5 w-5" />
                    <span>Company Information</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.companyName}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your Company Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Logo URL
                      </label>
                      <input
                        type="url"
                        value={formData.logoUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Globe className="h-5 w-5" />
                    <span>Localization</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Display Currency
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as SupportedCurrency }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {supportedCurrencies.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.name} ({currency.code}) - {currency.symbol}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        All amounts are stored in DKK and converted for display
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        System Language
                      </label>
                      <select
                        value={formData.language}
                        onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value as 'en' | 'da' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="en">English</option>
                        <option value="da">Dansk</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Email & Communication Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Email & Communication</span>
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sender Name
                    </label>
                    <input
                      type="text"
                      value={formData.emailSettings.senderName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        emailSettings: {
                          ...prev.emailSettings,
                          senderName: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Company Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sender Email
                    </label>
                    <input
                      type="email"
                      value={formData.emailSettings.senderEmail}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        emailSettings: {
                          ...prev.emailSettings,
                          senderEmail: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="noreply@yourcompany.com"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Email Service Status</h4>
                  <div className="space-y-2 text-sm text-blue-700">
                    <div className="flex items-center justify-between">
                      <span>Brevo API Integration:</span>
                      <span className="text-green-600 font-medium">Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Default Sender:</span>
                      <span className="text-blue-600">{formData.emailSettings.senderEmail || 'Not configured'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Auto Reminders:</span>
                      <span className="text-green-600 font-medium">10d & 5d before expiry</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Operations Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Business Operations</span>
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Payment Method
                    </label>
                    <select
                      value={formData.businessSettings.defaultPaymentMethod}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        businessSettings: {
                          ...prev.businessSettings,
                          defaultPaymentMethod: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Storyline">Storyline</option>
                      <option value="Revolut">Revolut</option>
                      <option value="MobilePay">MobilePay</option>
                      <option value="PayPal">PayPal</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Auto-renew subscriptions</label>
                        <p className="text-xs text-gray-500">Automatically renew active subscriptions</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.businessSettings.subscriptionAutoRenew}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          businessSettings: {
                            ...prev.businessSettings,
                            subscriptionAutoRenew: e.target.checked
                          }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Allow manual payments</label>
                        <p className="text-xs text-gray-500">Enable offline/manual payment processing</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.businessSettings.allowManualPayments}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          businessSettings: {
                            ...prev.businessSettings,
                            allowManualPayments: e.target.checked
                          }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Require prepayment</label>
                        <p className="text-xs text-gray-500">Require payment before service activation</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.businessSettings.requirePrepayment}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          businessSettings: {
                            ...prev.businessSettings,
                            requirePrepayment: e.target.checked
                          }
                        }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Reminder Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-blue-900">10-Day Reminder</label>
                        <p className="text-xs text-blue-700">Send reminder 10 days before expiry</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.businessSettings.reminderDays10}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          businessSettings: {
                            ...prev.businessSettings,
                            reminderDays10: e.target.checked
                          }
                        }))}
                        className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-orange-900">5-Day Reminder</label>
                        <p className="text-xs text-orange-700">Send final reminder 5 days before expiry</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.businessSettings.reminderDays5}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          businessSettings: {
                            ...prev.businessSettings,
                            reminderDays5: e.target.checked
                          }
                        }))}
                        className="rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Exchange Rates & Currency */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Exchange Rates & Currency</span>
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Base Currency:</strong> DKK (Danish Krone)
                        </p>
                        {state.exchangeRates && (
                          <p className="text-sm text-gray-600">
                            <strong>Last Updated:</strong> {new Date(state.exchangeRates.lastUpdated).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleRefreshExchangeRates}
                        disabled={isRefreshingRates}
                        className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`h-4 w-4 ${isRefreshingRates ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                    </div>

                    {state.exchangeRates && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(state.exchangeRates.rates).map(([currency, rate]) => (
                          <div key={currency} className="text-center p-3 bg-white rounded border">
                            <div className="font-medium text-gray-900">{currency}</div>
                            <div className="text-sm text-gray-600">
                              {currency === 'DKK' ? '1.00' : rate.toFixed(4)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {state.exchangeRates && !state.exchangeRates.success && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> Using fallback exchange rates. Live rates may be unavailable.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Currency Info</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="p-3 bg-blue-50 rounded">
                      <strong className="text-blue-900">Storage:</strong>
                      <p className="text-blue-700">All amounts stored in DKK</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded">
                      <strong className="text-green-900">Display:</strong>
                      <p className="text-green-700">Converted to selected currency</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded">
                      <strong className="text-purple-900">Updates:</strong>
                      <p className="text-purple-700">Daily automatic refresh</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription Reminder System Status */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Reminder System</h3>
              
              <div className={`mb-4 p-4 rounded-lg border ${
                reminderValidation.isValid 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-center space-x-2">
                  {reminderValidation.isValid ? (
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  ) : (
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  )}
                  <p className={`text-sm font-medium ${
                    reminderValidation.isValid ? 'text-green-800' : 'text-amber-800'
                  }`}>
                    {reminderValidation.isValid 
                      ? 'Reminder system is fully configured' 
                      : `${reminderValidation.missing.length} reminder template(s) missing`
                    }
                  </p>
                </div>
                {!reminderValidation.isValid && (
                  <p className="text-xs text-amber-700 mt-1">
                    Visit Email Templates to create missing templates: {reminderValidation.missing.join(', ')}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-blue-900">10-Day Reminder</h4>
                    <p className="text-sm text-blue-700">Send reminder 10 days before subscription expires</p>
                  </div>
                  <div className={`font-semibold ${
                    reminderValidation.existing.includes('subscription_10_day_reminder')
                      ? 'text-green-600' 
                      : 'text-amber-600'
                  }`}>
                    {reminderValidation.existing.includes('subscription_10_day_reminder') ? 'Configured' : 'Missing Template'}
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-amber-900">5-Day Reminder</h4>
                    <p className="text-sm text-amber-700">Send final reminder 5 days before subscription expires</p>
                  </div>
                  <div className={`font-semibold ${
                    reminderValidation.existing.includes('subscription_5_day_reminder')
                      ? 'text-green-600' 
                      : 'text-amber-600'
                  }`}>
                    {reminderValidation.existing.includes('subscription_5_day_reminder') ? 'Configured' : 'Missing Template'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                type="submit"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 font-medium"
              >
                <Save className="h-5 w-5" />
                <span>Save All Settings</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}