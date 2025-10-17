import React, { useState } from 'react';
import { Download, Database, FileText, Calendar, Shield, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function DataExport() {
  const { state } = useApp();
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<'all' | 'customers' | 'sales' | 'purchases' | 'inventory'>('all');

  const exportData = async () => {
    setExporting(true);
    
    try {
      let dataToExport: any = {};
      const timestamp = new Date().toISOString().split('T')[0];
      
      switch (exportType) {
        case 'all':
          dataToExport = {
            customers: state.customers,
            resellers: state.resellers,
            suppliers: state.suppliers,
            digitalCodes: state.digitalCodes,
            tvBoxes: state.tvBoxes,
            sales: state.sales,
            purchases: state.purchases,
            subscriptions: state.subscriptions,
            subscriptionProducts: state.subscriptionProducts,
            emailTemplates: state.emailTemplates,
            settings: state.settings,
            exportDate: new Date().toISOString(),
            version: '1.0'
          };
          break;
        case 'customers':
          dataToExport = { customers: state.customers, exportDate: new Date().toISOString() };
          break;
        case 'sales':
          dataToExport = { sales: state.sales, exportDate: new Date().toISOString() };
          break;
        case 'purchases':
          dataToExport = { purchases: state.purchases, exportDate: new Date().toISOString() };
          break;
        case 'inventory':
          dataToExport = { 
            digitalCodes: state.digitalCodes, 
            tvBoxes: state.tvBoxes, 
            exportDate: new Date().toISOString() 
          };
          break;
      }

      // Create and download JSON file
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `business-data-${exportType}-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Also create CSV for customers if selected
      if (exportType === 'all' || exportType === 'customers') {
        const csvData = convertCustomersToCSV(state.customers);
        const csvBlob = new Blob([csvData], { type: 'text/csv' });
        const csvUrl = URL.createObjectURL(csvBlob);
        
        const csvLink = document.createElement('a');
        csvLink.href = csvUrl;
        csvLink.download = `customers-${timestamp}.csv`;
        document.body.appendChild(csvLink);
        csvLink.click();
        document.body.removeChild(csvLink);
        URL.revokeObjectURL(csvUrl);
      }

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const convertCustomersToCSV = (customers: any[]) => {
    if (customers.length === 0) return 'No data available';
    
    const headers = ['Name', 'Email', 'MAC Address', 'WhatsApp Number', 'User ID', 'Payment Method', 'Note', 'Created At'];
    const csvRows = [headers.join(',')];
    
    customers.forEach(customer => {
      const row = [
        `"${customer.name || ''}"`,
        `"${customer.email || ''}"`,
        `"${customer.macAddress || ''}"`,
        `"${customer.whatsappNumber || ''}"`,
        `"${customer.customFields?.userId || ''}"`,
        `"${customer.customFields?.paymentMethod || ''}"`,
        `"${customer.customFields?.note || ''}"`,
        `"${new Date(customer.createdAt).toLocaleDateString()}"`
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  };

  const getDataCount = () => {
    switch (exportType) {
      case 'all':
        return `${state.customers.length + state.sales.length + state.purchases.length + state.digitalCodes.length + state.tvBoxes.length} records`;
      case 'customers':
        return `${state.customers.length} customers`;
      case 'sales':
        return `${state.sales.length} sales`;
      case 'purchases':
        return `${state.purchases.length} purchases`;
      case 'inventory':
        return `${state.digitalCodes.length + state.tvBoxes.length} items`;
      default:
        return '0 records';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Database className="h-6 w-6 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Data Export & Backup</h3>
          <p className="text-sm text-gray-600">Export your business data for backup and security</p>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Data Security Recommendation</h4>
            <p className="text-sm text-blue-700 mb-2">
              Since this application contains sensitive business data with no other backup, we strongly recommend:
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Export your data regularly (weekly or daily)</li>
              <li>• Store backups in multiple secure locations</li>
              <li>• Keep exported files encrypted and password-protected</li>
              <li>• Test your backups periodically to ensure they work</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Data to Export
          </label>
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Complete Database (All Data)</option>
            <option value="customers">Customers Only</option>
            <option value="sales">Sales Records Only</option>
            <option value="purchases">Purchase Records Only</option>
            <option value="inventory">Inventory Only (Digital Codes & TV Boxes)</option>
          </select>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Export Preview</p>
              <p className="text-sm text-gray-600">This will export {getDataCount()}</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Formats */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Export Formats</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <FileText className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">JSON Format</p>
              <p className="text-xs text-gray-600">Complete data with structure</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">CSV Format</p>
              <p className="text-xs text-gray-600">Spreadsheet-compatible (customers)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-amber-900 mb-1">Important Security Notice</h4>
            <p className="text-sm text-amber-700">
              Exported files contain sensitive business information. Store them securely and never share them publicly. 
              Consider encrypting the files before storing them in cloud services.
            </p>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={exportData}
        disabled={exporting}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {exporting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <Download className="h-5 w-5" />
            <span>Export Data</span>
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center mt-3">
        Files will be downloaded to your device automatically
      </p>
    </div>
  );
}