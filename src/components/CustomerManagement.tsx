import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, User, Phone, Wifi, Upload, Download, X, Check, FileText, Calendar, CreditCard, Eye, Tv, Copy, Send, Shield, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../components/AuthProvider';
import { Customer, Invoice, CustomerCredential } from '../types'; // Import Invoice and CustomerCredential types
import { toast } from 'react-toastify';
import DataTable from './common/DataTable';
import {
  getCustomerCredentialsByCustomerId,
  createCustomerCredential,
  updateCustomerCredential,
  deleteCustomerCredential
} from '../services/supabaseService';
import CredentialEmailService from '../services/credentialEmailService';

export default function CustomerManagement() {
  const { state, actions } = useApp();
  const { authUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Credentials management state
  const [customerCredentials, setCustomerCredentials] = useState<CustomerCredential[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [editingCredential, setEditingCredential] = useState<CustomerCredential | null>(null);
  const [credentialFormData, setCredentialFormData] = useState<Omit<CustomerCredential, 'id' | 'created_at' | 'updated_at' | 'customer_id'>>({
    server_url: '',
    server_id: '',
    password: '',
    mac_address: '',
    expires_at: '',
    notes: ''
  });
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'credentials'>('details');
  const [formData, setFormData] = useState<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    email: '',
    macAddress: '',
    whatsappNumber: '',
    customFields: {} as Record<string, string>,
    phone: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    notes: '',
    status: 'active',
    user_id: authUser?.id || '',
  });

  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] }>({ success: 0, errors: [] });

  // Sort customers by creation date (newest first)
  const sortedCustomers = useMemo(() => {
    return [...state.customers].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [state.customers]);

  // Standard customer fields for mapping
  const standardFields = [
    { key: 'name', label: 'Name', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'address', label: 'Address', required: false },
    { key: 'city', label: 'City', required: false },
    { key: 'country', label: 'Country', required: false },
    { key: 'postalCode', label: 'Postal Code', required: false },
    { key: 'notes', label: 'Notes', required: false },
    { key: 'status', label: 'Status', required: false },
    { key: 'macAddress', label: 'MAC Address', required: false },
    { key: 'whatsappNumber', label: 'WhatsApp Number', required: false }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authUser) {
      toast.error("You must be logged in to create a customer.");
      return;
    }

    try {
      const customerData = {
        name: formData.name,
        email: formData.email,
        macAddress: formData.macAddress,
        whatsappNumber: formData.whatsappNumber,
        customFields: formData.customFields,
        phone: formData.phone || '',
        address: formData.address || '',
        city: formData.city || '',
        country: formData.country || '',
        postalCode: formData.postalCode || '',
        notes: formData.notes || '',
        status: formData.status,
        user_id: authUser.id,
      };

      if (editingCustomer) {
        await actions.updateCustomer(editingCustomer.id, customerData);
        toast.success("Customer updated successfully!");
      } else {
        await actions.createCustomer(customerData as any);
        toast.success("Customer added successfully!");
      }

      resetForm();
    } catch (error: any) {
      toast.error(`Error saving customer: ${error.message}`);
      console.error('Error saving customer:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', email: '', macAddress: '', whatsappNumber: '', customFields: {},
      phone: '', address: '', city: '', country: '', postalCode: '', notes: '', status: 'active',
      user_id: authUser?.id || '',
    });
    setShowForm(false);
    setEditingCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email,
      macAddress: customer.macAddress || '',
      whatsappNumber: customer.whatsappNumber || '',
      customFields: customer.customFields || {},
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      country: customer.country || '',
      postalCode: customer.postalCode || '',
      notes: customer.notes || '',
      status: customer.status || 'active',
      user_id: customer.user_id || authUser?.id || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        await actions.deleteCustomer(id);
        toast.success("Customer deleted successfully!");
      } catch (error: any) {
        toast.error(`Error deleting customer: ${error.message}`);
        console.error('Error deleting customer:', error);
      }
    }
  };



  const handleCustomerModalClose = () => {
    setShowCustomerModal(false);
    setSelectedCustomer(null);
    // Reset credentials state
    setCustomerCredentials([]);
    setShowCredentialForm(false);
    setEditingCredential(null);
    setCredentialsLoading(false);
    setActiveTab('details');
  };

  const addCustomField = () => {
    const fieldName = prompt('Enter field name:');
    if (fieldName) {
      setFormData(prev => ({
        ...prev,
        customFields: { ...prev.customFields, [fieldName]: '' }
      }));
    }
  };

  const updateCustomField = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      customFields: { ...prev.customFields, [fieldName]: value }
    }));
  };

  const removeCustomField = (fieldName: string) => {
    setFormData(prev => {
      const newFields = { ...prev.customFields };
      delete newFields[fieldName];
      return { ...prev, customFields: newFields };
    });
  };

  // CSV Import functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      parseCSV(file);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        alert('CSV file must contain at least a header row and one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      setCsvHeaders(headers);
      setCsvData(data);
      setImportStep('mapping');

      // Auto-map common fields
      const autoMapping: Record<string, string> = {};
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('name') && !lowerHeader.includes('company')) {
          autoMapping[header] = 'name';
        } else if (lowerHeader.includes('email')) {
          autoMapping[header] = 'email';
        } else if (lowerHeader.includes('mac')) {
          autoMapping[header] = 'macAddress';
        } else if (lowerHeader.includes('whatsapp')) {
          autoMapping[header] = 'whatsappNumber';
        } else if (lowerHeader.includes('phone')) {
          autoMapping[header] = 'phone';
        } else if (lowerHeader.includes('address')) {
          autoMapping[header] = 'address';
        } else if (lowerHeader.includes('city')) {
          autoMapping[header] = 'city';
        } else if (lowerHeader.includes('country')) {
          autoMapping[header] = 'country';
        } else if (lowerHeader.includes('postal')) {
          autoMapping[header] = 'postalCode';
        } else if (lowerHeader.includes('note')) {
          autoMapping[header] = 'notes';
        } else if (lowerHeader.includes('status')) {
          autoMapping[header] = 'status';
        }
      });
      setFieldMapping(autoMapping);
    };
    reader.readAsText(file);
  };

  const handleFieldMapping = (csvField: string, targetField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [csvField]: targetField
    }));
  };

  const createCustomFieldKey = (fieldName: string) => {
    return `custom_${fieldName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
  };

  const previewImport = () => {
    const mappedFields = Object.values(fieldMapping);
    const hasName = mappedFields.includes('name');
    const hasEmail = mappedFields.includes('email');

    if (!hasName || !hasEmail) {
      alert('Name and Email fields are required. Please map them before proceeding.');
      return;
    }

    setImportStep('preview');
  };

  const executeImport = async () => {
    setImportStep('importing');
    setImportProgress(0);

    const results = { success: 0, errors: [] as string[] };

    for (let i = 0; i < csvData.length; i++) {
      try {
        const row = csvData[i];
        const customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> = {
          name: '', email: '', status: 'active', customFields: {},
          phone: '', address: '', city: '', country: '', postalCode: '', notes: '',
          macAddress: '', whatsappNumber: '', user_id: authUser?.id || ''
        };

        Object.entries(fieldMapping).forEach(([csvField, targetField]) => {
          const value = row[csvField];
          if (value !== undefined && value !== null) { // Ensure value is not undefined/null
            const standardField = standardFields.find(f => f.key === targetField);
            if (standardField) {
              (customerData as any)[targetField] = String(value); // Cast to string
            } else {
              customerData.customFields[targetField] = String(value); // Cast to string
            }
          }
        });

        Object.entries(row).forEach(([csvField, value]) => {
          if (!fieldMapping[csvField] && value !== undefined && value !== null) { // Ensure value is not undefined/null
            const customFieldKey = createCustomFieldKey(csvField);
            // Explicitly convert value to string before assignment
            customerData.customFields[customFieldKey] = String(value);
          }
        });

        if (!customerData.name || !customerData.email) {
          results.errors.push(`Row ${i + 1}: Missing required fields (name or email)`);
          continue;
        }

        await actions.createCustomer(customerData);
        results.success++;

        setImportProgress(((i + 1) / csvData.length) * 100);
      } catch (error) {
        results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setImportResults(results);

    setTimeout(() => {
      resetImportState();
    }, 3000);
  };

  const resetImportState = () => {
    setCsvFile(null);
    setCsvData([]);
    setCsvHeaders([]);
    setFieldMapping({});
    setImportStep('upload');
    setImportProgress(0);
    setImportResults({ success: 0, errors: [] });
    setShowImportModal(false);
  };

  const downloadTemplate = () => {
    const template = 'Name,Email,Phone,Address,City,Country,Postal Code,Notes,Status,MAC Address,WhatsApp Number,User ID,Payment Method,Custom Field Example\n"John Doe","john@example.com","+4512345678","123 Main St","Copenhagen","Denmark","1000","VIP Customer","active","00:11:22:33:44:55","+4512345678","USER001","Storyline","Extra Value"';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Credentials Management Functions
  const fetchCustomerCredentials = async (customerId: string) => {
    try {
      setCredentialsLoading(true);
      const credentials = await getCustomerCredentialsByCustomerId(customerId);
      setCustomerCredentials(credentials);
    } catch (error: any) {
      toast.error(`Failed to load credentials: ${error.message}`);
    } finally {
      setCredentialsLoading(false);
    }
  };

  const handleCustomerClick = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);
    await fetchCustomerCredentials(customer.id);
  };

  const resetCredentialForm = () => {
    setCredentialFormData({
      server_url: '',
      server_id: '',
      password: '',
      mac_address: '',
      expires_at: '',
      notes: ''
    });
    setShowCredentialForm(false);
    setEditingCredential(null);
  };

  const handleAddCredential = () => {
    if (!selectedCustomer) return;
    resetCredentialForm();
    setShowCredentialForm(true);
  };

  const handleEditCredential = (credential: CustomerCredential) => {
    setCredentialFormData({
      server_url: credential.server_url,
      server_id: credential.server_id,
      password: credential.password || '',
      mac_address: credential.mac_address || '',
      expires_at: credential.expires_at || '',
      notes: credential.notes || ''
    });
    setEditingCredential(credential);
    setShowCredentialForm(true);
  };

  const handleSaveCredential = async () => {
    if (!selectedCustomer) return;

    try {
      const credentialData = {
        ...credentialFormData,
        customer_id: selectedCustomer.id
      };

      if (editingCredential) {
        // Update existing credential
        const updatedCredential = await updateCustomerCredential(editingCredential.id, credentialData);
        setCustomerCredentials(prev => 
          prev.map(c => c.id === editingCredential.id ? updatedCredential : c)
        );
        
        if (sendEmailNotification) {
          await CredentialEmailService.sendCredentialEmail(selectedCustomer, updatedCredential, 'updated');
        }
        toast.success('Credential updated successfully!');
      } else {
        // Create new credential
        const newCredential = await createCustomerCredential(credentialData);
        setCustomerCredentials(prev => [newCredential, ...prev]);
        
        if (sendEmailNotification) {
          await CredentialEmailService.sendCredentialEmail(selectedCustomer, newCredential, 'created');
        }
        toast.success('Credential created and email sent successfully!');
      }

      resetCredentialForm();
    } catch (error: any) {
      toast.error(`Failed to save credential: ${error.message}`);
    }
  };

  const handleDeleteCredential = async (credentialId: string) => {
    if (!selectedCustomer) return;
    
    if (!confirm('Are you sure you want to delete this credential? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteCustomerCredential(credentialId);
      setCustomerCredentials(prev => prev.filter(c => c.id !== credentialId));
      
      const credential = customerCredentials.find(c => c.id === credentialId);
      if (credential && sendEmailNotification) {
        await CredentialEmailService.sendCredentialEmail(selectedCustomer, credential, 'deleted');
      }
      
      toast.success('Credential deleted successfully!');
    } catch (error: any) {
      toast.error(`Failed to delete credential: ${error.message}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard!');
    });
  };

  const isCredentialExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const calculateTotalSpent = (customerId: string): number => { // Explicitly type return as number
    return state.invoices
      .filter((inv: Invoice) => inv.customerId === customerId && inv.status === 'paid') // Explicitly type inv
      .reduce((acc: number, inv: Invoice) => acc + inv.amount, 0); // Explicitly type acc and inv
  };

  const handleResendCredentialEmail = async (credential: CustomerCredential) => {
    if (!selectedCustomer) return;

    try {
      await CredentialEmailService.sendCredentialEmail(selectedCustomer, credential, 'created');
      toast.success('Credential email sent successfully!');
    } catch (error: any) {
      toast.error(`Failed to send email: ${error.message}`);
      console.error('Failed to resend credential email:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Customer Management</h2>
          <p className="text-gray-600 mt-2">Manage your customer database and communication</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 shadow-sm"
          >
            <Upload className="h-4 w-4" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, MAC, WhatsApp, or User ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Import Customers from CSV</h3>
              <button
                onClick={resetImportState}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Step 1: Upload */}
            {importStep === 'upload' && (
              <div className="space-y-6">
                <div className="text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Upload CSV File</h4>
                  <p className="text-gray-600 mb-6">Select a CSV file containing customer data to import</p>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">Click to select CSV file</span>
                    </label>
                  </div>

                  <button
                    onClick={downloadTemplate}
                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1 mx-auto"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download CSV Template</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Field Mapping */}
            {importStep === 'mapping' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Map CSV Fields</h4>
                  <p className="text-gray-600 mb-6">Map your CSV columns to customer fields. Required fields are marked with *</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {csvHeaders.map((header) => (
                    <div key={header} className="border border-gray-200 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CSV Column: <span className="font-semibold">{header}</span>
                      </label>
                      <select
                        value={fieldMapping[header] || ''}
                        onChange={(e) => handleFieldMapping(header, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Skip this field --</option>
                        {standardFields.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label} {field.required ? '*' : ''}
                          </option>
                        ))}
                        <option value="userId">User ID</option>
                        <option value="paymentMethod">Payment Method</option>
                        <option value="note">Note</option>
                        <option value={createCustomFieldKey(header)}>
                          Create Custom Field: {header}
                        </option>
                      </select>
                      {csvData[0] && (
                        <p className="text-xs text-gray-500 mt-1">
                          Sample: {csvData[0][header]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setImportStep('upload')}
                    className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={previewImport}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Preview Import
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Preview */}
            {importStep === 'preview' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Preview Import</h4>
                  <p className="text-gray-600 mb-6">Review the first 5 rows before importing {csvData.length} customers</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">MAC Address</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">WhatsApp</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Custom Fields</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {csvData.slice(0, 5).map((row, index) => {
                        const mappedData: any = { customFields: {} };
                        Object.entries(fieldMapping).forEach(([csvField, targetField]) => {
                          const value = row[csvField];
                          const standardField = standardFields.find(f => f.key === targetField);
                          if (standardField) {
                            mappedData[targetField] = value;
                          } else {
                            mappedData.customFields[targetField] = value;
                          }
                        });

                        return (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{mappedData.name || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{mappedData.email || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{mappedData.macAddress || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{mappedData.whatsappNumber || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {mappedData.customFields && Object.entries(mappedData.customFields).map(([key, value]) => (
                                <div key={key} className="text-xs">
                                  <span className="font-medium">{key}:</span> {value as string}
                                </div>
                              ))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setImportStep('mapping')}
                    className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back to Mapping
                  </button>
                  <button
                    onClick={executeImport}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Import {csvData.length} Customers
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Importing */}
            {importStep === 'importing' && (
              <div className="space-y-6 text-center">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Importing Customers</h4>
                  <p className="text-gray-600 mb-6">Please wait while we import your customers...</p>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  ></div>
                </div>

                <p className="text-sm text-gray-600">{Math.round(importProgress)}% complete</p>

                {importResults.success > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-green-800">
                        Successfully imported {importResults.success} customers
                      </span>
                    </div>
                  </div>
                )}

                {importResults.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h5 className="font-medium text-red-800 mb-2">Import Errors:</h5>
                    <ul className="text-sm text-red-700 space-y-1">
                      {importResults.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {importResults.errors.length > 5 && (
                        <li>• ... and {importResults.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Details Modal with Tabs */}
      {showCustomerModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Customer Details</h3>
              <button
                onClick={handleCustomerModalClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'details'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Customer Details
                </button>
                <button
                  onClick={() => setActiveTab('credentials')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'credentials'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Tv className="h-4 w-4" />
                  <span>IPTV Credentials ({customerCredentials.length})</span>
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">{selectedCustomer.name}</h4>
                    <p className="text-gray-600">{selectedCustomer.email}</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-2 ${
                      selectedCustomer.status === 'active' ? 'bg-green-100 text-green-800' :
                      selectedCustomer.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedCustomer.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Contact Information</h5>
                    <div className="space-y-3">
                      {selectedCustomer.phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-3" />
                          <span className="text-sm text-gray-900">{selectedCustomer.phone}</span>
                        </div>
                      )}
                      {selectedCustomer.whatsappNumber && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-3" />
                          <span className="text-sm text-gray-900">WhatsApp: {selectedCustomer.whatsappNumber}</span>
                        </div>
                      )}
                      {selectedCustomer.address && (
                        <div className="text-sm text-gray-900">
                          <p>{selectedCustomer.address}</p>
                          {selectedCustomer.city && <p>{selectedCustomer.city}, {selectedCustomer.country} {selectedCustomer.postalCode}</p>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Device Information</h5>
                    <div className="space-y-3">
                      {selectedCustomer.macAddress && (
                        <div className="flex items-center">
                          <Wifi className="h-4 w-4 text-gray-400 mr-3" />
                          <span className="text-sm text-gray-900">{selectedCustomer.macAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedCustomer.customFields && Object.keys(selectedCustomer.customFields).length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Additional Information</h5>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(selectedCustomer.customFields).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium text-gray-700">{key}:</span>
                            <span className="ml-2 text-gray-900">{value as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedCustomer.notes && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Notes</h5>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start">
                        <FileText className="h-4 w-4 text-gray-400 mr-3 mt-0.5" />
                        <p className="text-sm text-gray-900">{selectedCustomer.notes}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t pt-6">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Created: {selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString() : 'Unknown'}</span>
                    <span>Updated: {selectedCustomer.updatedAt ? new Date(selectedCustomer.updatedAt).toLocaleDateString() : 'Unknown'}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'credentials' && (
              <div className="space-y-6">
                {/* Credentials Header */}
                <div className="flex justify-between items-center">
                  <div>
                    <h5 className="text-lg font-medium text-gray-900">IPTV Credentials</h5>
                    <p className="text-sm text-gray-600">Manage server credentials for {selectedCustomer.name}</p>
                  </div>
                  <button
                    onClick={handleAddCredential}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Credential</span>
                  </button>
                </div>

                {/* Email Notification Option */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="sendEmailNotification"
                      checked={sendEmailNotification}
                      onChange={(e) => setSendEmailNotification(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="sendEmailNotification" className="ml-3 text-sm text-blue-800">
                      Send email notification to customer when credentials are created, updated, or deleted
                    </label>
                  </div>
                </div>

                {/* Credentials List */}
                {credentialsLoading ? (
                  <div className="text-center p-8">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading credentials...</p>
                  </div>
                ) : customerCredentials.length > 0 ? (
                  <div className="space-y-4">
                    {customerCredentials.map((credential) => (
                      <div key={credential.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h6 className="text-lg font-semibold text-blue-900">{credential.server_url}</h6>
                              {credential.expires_at && isCredentialExpired(credential.expires_at) && (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  Expired
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-blue-700">Server ID:</span>
                                <div className="flex items-center mt-1">
                                  <span className="font-mono text-blue-900 bg-blue-100 px-2 py-1 rounded flex-1">{credential.server_id}</span>
                                  <button
                                    onClick={() => copyToClipboard(credential.server_id || '')}
                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              

                              
                              {credential.password && (
                                <div>
                                  <span className="font-medium text-blue-700">Password:</span>
                                  <div className="flex items-center mt-1">
                                    <span className="font-mono text-blue-900 bg-blue-100 px-2 py-1 rounded flex-1">{credential.password}</span>
                                    <button
                                      onClick={() => copyToClipboard(credential.password || '')}
                                      className="ml-2 text-blue-600 hover:text-blue-800"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {credential.mac_address && (
                                <div>
                                  <span className="font-medium text-blue-700">MAC Address:</span>
                                  <div className="flex items-center mt-1">
                                    <span className="font-mono text-blue-900 bg-blue-100 px-2 py-1 rounded flex-1">{credential.mac_address}</span>
                                    <button
                                      onClick={() => copyToClipboard(credential.mac_address || '')}
                                      className="ml-2 text-blue-600 hover:text-blue-800"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {credential.expires_at && (
                                <div>
                                  <span className="font-medium text-blue-700">Expires:</span>
                                  <span className="ml-2 text-blue-900">{new Date(credential.expires_at).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                            
                            {credential.notes && (
                              <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded-lg">
                                <span className="text-sm font-medium text-blue-800">Notes: </span>
                                <span className="text-sm text-blue-700">{credential.notes}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => handleResendCredentialEmail(credential)}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors"
                              title="Send email again"
                            >
                              <Mail className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditCredential(credential)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Edit credential"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCredential(credential.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                              title="Delete credential"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 border-t border-blue-200 pt-3">
                          Created: {credential.created_at ? new Date(credential.created_at).toLocaleDateString() : 'Unknown'}
                          {credential.updated_at && credential.updated_at !== credential.created_at && (
                            <span className="ml-4">Updated: {new Date(credential.updated_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                    <Tv className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h6 className="text-lg font-medium text-gray-900 mb-2">No credentials found</h6>
                    <p className="text-gray-600">This customer doesn't have any IPTV credentials yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end space-x-4 pt-6 border-t mt-6">
              <button
                onClick={handleCustomerModalClose}
                className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleCustomerModalClose();
                  handleEdit(selectedCustomer);
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credential Form Modal */}
      {showCredentialForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingCredential ? 'Edit IPTV Credential' : 'Add New IPTV Credential'}
              </h3>
              <button
                onClick={resetCredentialForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveCredential(); }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Server URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={credentialFormData.server_url}
                    onChange={(e) => setCredentialFormData(prev => ({ ...prev, server_url: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="http://example.com:8000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Server ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={credentialFormData.server_id}
                    onChange={(e) => setCredentialFormData(prev => ({ ...prev, server_id: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="SERVER001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="text"
                  required
                  value={credentialFormData.password}
                  onChange={(e) => setCredentialFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter password"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MAC Address
                  </label>
                  <div className="relative">
                    <Wifi className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={credentialFormData.mac_address}
                      onChange={(e) => setCredentialFormData(prev => ({ ...prev, mac_address: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="00:00:00:00:00:00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expires At
                  </label>
                  <input
                    type="datetime-local"
                    value={credentialFormData.expires_at}
                    onChange={(e) => setCredentialFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={credentialFormData.notes}
                  onChange={(e) => setCredentialFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional notes about this credential..."
                />
              </div>

              {/* Email Notification Display */}
              {sendEmailNotification && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Send className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Email Notification</p>
                      <p className="text-sm text-blue-600">
                        {editingCredential 
                          ? 'Customer will receive an email with the updated credentials.'
                          : 'Customer will receive an email with the new credentials.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetCredentialForm}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!credentialFormData.server_url || !credentialFormData.server_id}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingCredential ? 'Update' : 'Create'} Credential
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="customer@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+45 12 34 56 78"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123 Main St"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Copenhagen"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Denmark"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'suspended' }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MAC Address
                  </label>
                  <div className="relative">
                    <Wifi className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.macAddress || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, macAddress: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="00:00:00:00:00:00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.whatsappNumber || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+45 12 34 56 78"
                    />
                  </div>
                </div>
              </div>

              {/* Predefined Custom Fields */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Additional Information</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <select
                        value={formData.customFields.paymentMethod || ''}
                        onChange={(e) => updateCustomField('paymentMethod', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select payment method</option>
                        <option value="Storyline">Storyline</option>
                        <option value="Revolut">Revolut</option>
                        <option value="PayPal">PayPal</option>
                        <option value="MobilePay">MobilePay</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <textarea
                      rows={3}
                      value={formData.notes || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add any notes about this customer..."
                    />
                  </div>
                </div>
              </div>

              {/* Additional Custom Fields */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Additional Custom Fields
                  </label>
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Field
                  </button>
                </div>

                {formData.customFields && Object.entries(formData.customFields)
                  .filter(([key]) => !['userId', 'paymentMethod', 'note'].includes(key))
                  .map(([fieldName, value]) => (
                    <div key={fieldName} className="flex space-x-3 mb-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder={fieldName}
                          value={value}
                          onChange={(e) => updateCustomField(fieldName, e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomField(fieldName)}
                        className="px-3 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingCustomer ? 'Update' : 'Add'} Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {state.loading ? (
            <div className="p-12 text-center">Loading customers...</div>
          ) : (
            <DataTable
              data={sortedCustomers}
              columns={[
                {
                  key: 'name',
                  label: 'Customer',
                  render: (value, customer) => (
                    <div 
                      className="flex items-center cursor-pointer hover:bg-blue-50 rounded-lg p-2 transition-colors"
                      onClick={() => handleCustomerClick(customer)}
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-blue-600 hover:text-blue-800">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                        <div className="text-xs text-gray-400 mt-1 flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          Click to view details
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  key: 'email',
                  label: 'Contact Info',
                  render: (value, customer) => (
                    <div>
                      <div className="text-sm text-gray-900">{customer.email}</div>
                      {customer.whatsappNumber && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {customer.whatsappNumber}
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  key: 'macAddress',
                  label: 'Device Info',
                  render: (value, customer) => customer.macAddress ? (
                    <div className="text-sm text-gray-900 flex items-center">
                      <Wifi className="h-3 w-3 mr-1" />
                      {customer.macAddress}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )
                },
                {
                  key: 'customFields',
                  label: 'User Details',
                  render: (value, customer) => (
                    <div className="text-sm text-gray-600 space-y-1">
                      {customer.customFields?.userId && (
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="font-medium">ID:</span> {customer.customFields.userId}
                        </div>
                      )}
                      {customer.customFields?.paymentMethod && (
                        <div className="flex items-center">
                          <CreditCard className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="font-medium">Payment:</span>
                          <span className="ml-1 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {customer.customFields.paymentMethod}
                          </span>
                        </div>
                      )}
                      {customer.notes && (
                        <div className="flex items-start">
                          <FileText className="h-3 w-3 mr-1 text-gray-400 mt-0.5" />
                          <span className="text-xs text-gray-500 line-clamp-2">{customer.notes}</span>
                        </div>
                      )}
                      {customer.customFields && Object.entries(customer.customFields)
                        .filter(([key]) => !['userId', 'paymentMethod', 'note'].includes(key))
                        .map(([key, val]) => (
                          <div key={key} className="text-xs">
                            <span className="font-medium">{key}:</span> {val as string}
                          </div>
                        ))}
                    </div>
                  )
                },
                {
                  key: 'createdAt',
                  label: 'Created',
                  sortable: true,
                  render: (value) => (
                    <div className="text-sm text-gray-600 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {value ? new Date(value).toLocaleDateString() : '-'}
                    </div>
                  )
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (value, customer) => (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                }
              ]}
              searchKeys={['name', 'email', 'macAddress', 'whatsappNumber'] as (keyof Customer)[]}
              pageSize={25}
              emptyMessage="No customers found"
              className="shadow-lg border border-gray-200"
            />
          )}
        </div>
      </div>
    );
  }
