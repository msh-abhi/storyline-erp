import React, { useState, useEffect } from 'react';
import { Save, Upload, Settings as SettingsIcon, RefreshCw, Mail, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from './AuthProvider';
import { Settings, SupportedCurrency } from '../types';
import { getSupportedCurrencies } from '../utils/calculations';
import { validateReminderTemplates } from '../utils/subscriptionUtils';
import DataExport from './DataExport';

export default function SettingsComponent() {
  const { state, actions } = useApp();
  const { signOut, authUser } = useAuth();
  const [formData, setFormData] = useState({
    companyName: 'Jysk Streaming',
    logoUrl: '',
    currency: 'DKK' as SupportedCurrency,
    language: 'en' as 'en' | 'da',
    emailSettings: {
      senderName: '',
      senderEmail: ''
    }
  });
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);

  const supportedCurrencies = getSupportedCurrencies();

  // Check reminder template status
  const reminderValidation = validateReminderTemplates(state.emailTemplates);

  useEffect(() => {
    if (state.settings) {
      setFormData({
        companyName: state.settings.companyName,
        logoUrl: state.settings.logoUrl || '',
        currency: state.settings.currency as SupportedCurrency,
        language: state.settings.language,
        emailSettings: {
          senderName: state.settings.emailSettings?.senderName || '',
          senderEmail: state.settings.emailSettings?.senderEmail || ''
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

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600 mt-2">Configure your business settings and preferences</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Account Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Signed in as
              </label>
              <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                {authUser?.email ?? 'Loading...'}
              </p>
            </div>
            <div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Data Export & Backup */}
        <DataExport />

        {/* Application Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Company Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5" />
              <span>Company Information</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL
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

          {/* Email Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Email Settings</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  placeholder="Jysk Streaming"
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
                  placeholder="kontakt@jysk-streaming.fun"
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mt-4">
              <p className="text-sm text-blue-700 mb-2">
                <strong>Brevo API Integration:</strong> Configured and ready
              </p>
              <p className="text-sm text-blue-600">
                <strong>Default Sender:</strong> kontakt@jysk-streaming.fun
              </p>
              <p className="text-sm text-blue-600">
                <strong>Automatic Reminders:</strong> 7 days and 3 days before subscription expiry
              </p>
            </div>
          </div>

          {/* Localization & Currency */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Localization & Currency</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  Language
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

          {/* Exchange Rates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Exchange Rates</h3>
            
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
                  <span>Refresh Rates</span>
                </button>
              </div>

              {state.exchangeRates && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(state.exchangeRates.rates).map(([currency, rate]) => (
                    <div key={currency} className="text-center">
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

          {/* Subscription Reminder Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Reminders</h3>
            
            {/* Status Overview */}
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}