import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { customerService } from '../services/supabaseService';
import { Customer } from '../types';

const CustomerPortalProfile: React.FC = () => {
    const { authUser, userProfile, customerPortalUser } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Use type assertion to access the camelCase properties after keysToCamel conversion
  const portalUser = customerPortalUser as any;
  const hasCustomer = portalUser?.customerId && portalUser?.customerId !== null;

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.email?.split('@')[0] || 'User');
    }
    if (authUser) {
      setEmail(authUser.email || '');
    }
    if (customerPortalUser && hasCustomer) {
      const fetchCustomer = async () => {
        const customerData = await customerService.getById(portalUser.customerId);
        if (customerData) {
          setCustomer(customerData);
          setWhatsappNumber(customerData.whatsappNumber || '');
          setName(customerData.name || userProfile?.email?.split('@')[0] || 'User');
        }
      };
      fetchCustomer();
    }
  }, [userProfile, authUser, customerPortalUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!customer?.id) {
      setMessage('Error: Customer data not found.');
      setLoading(false);
      return;
    }

    try {
      await customerService.update(customer.id, {
        name,
        whatsappNumber,
      });
      setMessage('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage(`Failed to update profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">My Profile</h1>
      <p className="text-gray-600 mb-6">Update your personal information here.</p>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            id="name"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            id="email"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
            value={email}
            disabled // Email is usually managed by auth, not directly editable here
          />
          <p className="mt-1 text-sm text-gray-500">Email is managed through your login method.</p>
        </div>
        <div>
          <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
          <input
            type="text"
            id="whatsappNumber"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            disabled={loading}
          />
        </div>
        {/* Add other profile fields as needed */}
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        {message && (
          <p className={`mt-2 text-sm ${message.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
};

export default CustomerPortalProfile;