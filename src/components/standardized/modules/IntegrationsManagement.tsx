import React, { useState } from 'react';
import { CreditCard, Smartphone, Globe, Settings } from 'lucide-react';
import MobilePaySettings from '../../MobilePaySettings';
import RevolutSettings from '../../RevolutSettings';

const IntegrationsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('mobilepay');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-2">
          <Globe className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
        </div>
        <p className="text-gray-600">Manage payment providers and third-party integrations</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('mobilepay')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'mobilepay'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4" />
                <span>MobilePay</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('revolut')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'revolut'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4" />
                <span>Revolut</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'mobilepay' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">MobilePay Integration</h2>
                <p className="text-gray-600">
                  Configure MobilePay for automated subscription payments and recurring billing.
                </p>
              </div>
              <MobilePaySettings />
            </div>
          )}

          {activeTab === 'revolut' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Revolut Integration</h2>
                <p className="text-gray-600">
                  Set up Revolut for manual invoice payments and payment requests.
                </p>
              </div>
              <RevolutSettings />
            </div>
          )}
        </div>
      </div>

      {/* Integration Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Integration Status</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h4 className="font-medium text-green-900">MobilePay</h4>
            </div>
            <p className="text-sm text-green-700">Ready for setup</p>
          </div>
          
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <h4 className="font-medium text-blue-900">Revolut</h4>
            </div>
            <p className="text-sm text-blue-700">Ready for setup</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsManagement;