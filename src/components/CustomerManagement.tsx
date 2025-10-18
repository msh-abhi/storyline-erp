import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, User, Phone, Wifi, Upload, Download, X, Check, FileText, Calendar, CreditCard } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Customer, Invoice } from '../types'; // Import Invoice type
import { toast } from 'react-toastify';

export default function CustomerManagement() {
  const { state, actions } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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
  });

  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] }>({ success: 0, errors: [] });

  const filteredCustomers = useMemo(() => {
    return state.customers.filter((customer: Customer) => // Explicitly type customer
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.macAddress && customer.macAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.whatsappNumber && customer.whatsappNumber.includes(searchTerm)) ||
      (customer.customFields.userId && customer.customFields.userId.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [state.customers, searchTerm]);

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

    try {
      const customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name,
        email: formData.email,
        macAddress: formData.macAddress,
        whatsappNumber: formData.whatsappNumber,
        customFields: formData.customFields,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        postalCode: formData.postalCode,
        notes: formData.notes,
        status: formData.status,
      };

      if (editingCustomer) {
        await actions.updateCustomer(editingCustomer.id, customerData);
        toast.success("Customer updated successfully!");
      } else {
        await actions.createCustomer(customerData);
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
          macAddress: '', whatsappNumber: ''
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

  const calculateTotalSpent = (customerId: string): number => { // Explicitly type return as number
    return state.invoices
      .filter((inv: Invoice) => inv.customerId === customerId && inv.status === 'paid') // Explicitly type inv
      .reduce((acc: number, inv: Invoice) => acc + inv.amount, 0); // Explicitly type acc and inv
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
                      User ID
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.customFields.userId || ''}
                        onChange={(e) => updateCustomField('userId', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., USER001"
                      />
                    </div>
                  </div>

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
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No customers found</p>
            <p className="text-gray-400">Add your first customer to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device Info
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer: Customer) => ( // Explicitly type customer
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.email}</div>
                      {customer.whatsappNumber && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {customer.whatsappNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.macAddress ? (
                        <div className="text-sm text-gray-900 flex items-center">
                          <Wifi className="h-3 w-3 mr-1" />
                          {customer.macAddress}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
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
                          .map(([key, value]) => (
                            <div key={key} className="text-xs">
                              <span className="font-medium">{key}:</span> {value}
                            </div>
                          ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
