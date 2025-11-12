import React, { useState, useEffect } from 'react';
import { Mail, Send, Trash2, Eye } from 'lucide-react';
import { EmailDeliveryService } from '../services/emailDeliveryService';

interface PendingEmail {
  to: string;
  subject: string;
  body: string;
  originalHtml: string;
  timestamp: string;
  action: string;
  messageId?: string;
}

export default function PendingEmailsManager() {
  const [pendingEmails, setPendingEmails] = useState<PendingEmail[]>([]);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPendingEmails();
  }, []);

  const loadPendingEmails = () => {
    const emails = EmailDeliveryService.getPendingEmails();
    setPendingEmails(emails);
  };

  const sendEmailNow = async (email: PendingEmail) => {
    setLoading(true);
    try {
      // Try to send the email via the delivery service
      const result = await EmailDeliveryService.sendEmail({
        to: email.to,
        subject: email.subject,
        html: email.originalHtml,
        fromEmail: 'noreply@storyline.help',
        fromName: 'StoryLine ERP'
      });

      if (result.success) {
        alert(`✅ Email sent successfully to ${email.to}!`);
        // Remove from pending list
        EmailDeliveryService.clearPendingEmails();
        loadPendingEmails();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      alert(`❌ Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const openEmailClient = (email: PendingEmail) => {
    const mailtoLink = `mailto:${email.to}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
    window.open(mailtoLink, '_blank');
  };

  const deletePendingEmail = () => {
    if (confirm('Delete all pending emails? This cannot be undone.')) {
      EmailDeliveryService.clearPendingEmails();
      loadPendingEmails();
    }
  };

  if (pendingEmails.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Emails</h3>
          <p className="text-gray-600">All welcome emails have been processed or sent.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Mail className="h-6 w-6 text-orange-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Pending Welcome Emails ({pendingEmails.length})
            </h3>
            <p className="text-sm text-gray-600">
              These emails need to be sent manually due to service unavailability.
            </p>
          </div>
        </div>
        <button
          onClick={deletePendingEmail}
          className="flex items-center space-x-2 px-3 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          <span>Clear All</span>
        </button>
      </div>

      <div className="space-y-4">
        {pendingEmails.map((email, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-gray-900">{email.to}</span>
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                    Pending Manual Send
                  </span>
                </div>
                <p className="text-sm text-gray-600">{email.subject}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Created: {new Date(email.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowDetails(showDetails === email.to ? null : email.to)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => openEmailClient(email)}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Open in Email Client"
                >
                  <Mail className="h-4 w-4" />
                </button>
                <button
                  onClick={() => sendEmailNow(email)}
                  disabled={loading}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>Send Now</span>
                </button>
              </div>
            </div>

            {showDetails === email.to && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Email Content:</h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap mb-4">
                  {email.body}
                </div>
                <div className="text-xs text-gray-500">
                  <strong>HTML Version Available:</strong> The email was originally formatted with HTML styling.
                  Use "Open in Email Client" to get the full formatted version.
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">📧 How to Send These Emails:</h4>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. <strong>Send Now Button:</strong> Try automatic sending (may fail if no API keys configured)</li>
          <li>2. <strong>Email Client Button:</strong> Opens your default email app with pre-filled content</li>
          <li>3. <strong>Manual Copy:</strong> Copy the content from "View Details" and send manually</li>
        </ol>
      </div>
    </div>
  );
}