import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Mail, MessageCircle, Copy, Check } from 'lucide-react';

export default function CustomerPortalContact() {
  const { customerPortalUser } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Use type assertion to access the camelCase properties after keysToCamel conversion
  const portalUser = customerPortalUser as any;
  const customerId = portalUser?.customerId || 'N/A';
  const customerEmail = portalUser?.email || 'N/A';

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const supportEmail = 'kontakt@jysk-streaming.fun';
  const whatsappNumber = '+4591624906';
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Kontakt Support</h1>
          <p className="text-blue-100">Vi er her for at hjælpe dig! Kontakt os via email eller WhatsApp</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Customer Information */}
          <div className="mb-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">ℹ️</span>
              Dine Oplysninger
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Når du kontakter support, skal du inkludere følgende oplysninger i din besked:
            </p>

            <div className="space-y-3">
              {/* Customer ID */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Kunde-ID</p>
                    <p className="text-lg font-mono font-bold text-gray-800">{customerId}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(customerId, 'customerId')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                  >
                    {copiedField === 'customerId' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Kopieret!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Kopier
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Customer Email */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Din Email</p>
                    <p className="text-lg font-mono font-bold text-gray-800">{customerEmail}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(customerEmail, 'email')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                  >
                    {copiedField === 'email' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Kopieret!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Kopier
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Methods */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Email Support */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-600 p-3 rounded-lg">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Email Support</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Send os en email, og vi svarer hurtigst muligt
              </p>
              <a
                href={`mailto:${supportEmail}?subject=Support Request - Customer ID: ${customerId}`}
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
              >
                📧 {supportEmail}
              </a>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Klik for at åbne din email-klient
              </p>
            </div>

            {/* WhatsApp Support */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-600 p-3 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">WhatsApp Support</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Chat med os direkte på WhatsApp
              </p>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
              >
                💬 {whatsappNumber}
              </a>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Klik for at åbne WhatsApp
              </p>
            </div>
          </div>

          {/* Support Hours */}
          <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">⏰ Support Åbningstider</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p className="font-semibold text-gray-700">Mandag - Fredag</p>
                <p>09:00 - 17:00</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Weekend</p>
                <p>10:00 - 14:00</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Vi bestræber os på at svare inden for 24 timer på hverdage
            </p>
          </div>

          {/* Tips */}
          <div className="mt-6 bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
            <p className="text-sm text-purple-800">
              <strong>💡 Tip:</strong> Husk altid at inkludere dit <strong>Kunde-ID</strong> når du kontakter support,
              så vi hurtigere kan hjælpe dig!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}