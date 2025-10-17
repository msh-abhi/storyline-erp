import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { validateReminderTemplates, getRequiredReminderTemplates } from '../utils/subscriptionUtils';

export default function ReminderTemplateManager() {
  const { state, actions } = useApp();
  const [isCreating, setIsCreating] = useState(false);
  
  const validation = validateReminderTemplates(state.emailTemplates);
  const requiredTemplates = getRequiredReminderTemplates();

  const createMissingTemplates = async () => {
    setIsCreating(true);
    try {
      for (const template of requiredTemplates) {
        const exists = state.emailTemplates.some(t => t.trigger === template.trigger);
        if (!exists) {
          await actions.createEmailTemplate({
            name: template.name,
            subject: template.subject,
            content: template.content,
            trigger: template.trigger
          });
        }
      }
    } catch (error) {
      console.error('Error creating reminder templates:', error);
      alert('Failed to create some reminder templates. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {validation.isValid ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : (
            <AlertCircle className="h-6 w-6 text-amber-600" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Subscription Reminder Templates</h3>
            <p className="text-sm text-gray-600">
              {validation.isValid 
                ? 'All required reminder templates are configured' 
                : `${validation.missing.length} reminder template(s) missing`
              }
            </p>
          </div>
        </div>
        
        {!validation.isValid && (
          <button
            onClick={createMissingTemplates}
            disabled={isCreating}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isCreating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>{isCreating ? 'Creating...' : 'Create Missing Templates'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requiredTemplates.map((template) => {
          const exists = state.emailTemplates.some(t => t.trigger === template.trigger);
          const existingTemplate = state.emailTemplates.find(t => t.trigger === template.trigger);
          
          return (
            <div 
              key={template.trigger}
              className={`p-4 rounded-lg border-2 ${
                exists 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className={`font-medium ${
                  exists ? 'text-green-900' : 'text-amber-900'
                }`}>
                  {template.name}
                </h4>
                {exists ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                )}
              </div>
              
              <p className={`text-sm mb-2 ${
                exists ? 'text-green-700' : 'text-amber-700'
              }`}>
                <strong>Trigger:</strong> {template.trigger}
              </p>
              
              <p className={`text-sm ${
                exists ? 'text-green-700' : 'text-amber-700'
              }`}>
                <strong>Subject:</strong> {template.subject}
              </p>
              
              {exists && existingTemplate && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs text-green-600">
                    Template ID: {existingTemplate.id}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {validation.isValid && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-700">
              <strong>All reminder templates are configured!</strong> The subscription reminder system is ready to send automated emails at 10 days and 5 days before expiry.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p><strong>Note:</strong> These templates are used by the automated subscription reminder system. The 10-day reminder is sent as a friendly notice, while the 5-day reminder is marked as urgent.</p>
      </div>
    </div>
  );
}