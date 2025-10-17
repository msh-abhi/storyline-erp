import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { getCustomerCredentials } from '../services/supabaseService';
import { CustomerCredential } from '../types';
import { toast } from 'react-toastify';

// A simple component to display a single credential securely
const CredentialCard = ({ credential }: { credential: CustomerCredential }) => {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 space-y-2">
      <h3 className="text-xl font-semibold text-blue-400 truncate">{credential.server_url}</h3>
      
      <p className="text-gray-400">
        <strong>Server ID:</strong>
        <span className="font-mono text-gray-200 ml-2">{credential.server_id}</span>
      </p>

      {credential.mac_address && (
        <p className="text-gray-400">
          <strong>MAC Address:</strong>
          <span className="font-mono text-gray-200 ml-2">{credential.mac_address}</span>
        </p>
      )}

      {credential.password && (
        <div className="flex items-center">
          <p className="text-gray-400"><strong>Password:</strong></p>
          <span className={`font-mono text-gray-200 ml-2 ${!passwordVisible ? 'blur-sm' : ''}`}>
            {passwordVisible ? credential.password : '************'}
          </span>
          <button
            onClick={() => setPasswordVisible(!passwordVisible)}
            className="ml-4 text-sm text-blue-400 hover:text-blue-300"
            aria-label={passwordVisible ? "Hide password" : "Show password"}
          >
            {passwordVisible ? 'Hide' : 'Show'}
          </button>
        </div>
      )}

      {credential.expires_at && (
         <p className="text-gray-400">
          <strong>Expires:</strong>
          <span className="text-gray-200 ml-2">{new Date(credential.expires_at).toLocaleDateString()}</span>
        </p>
      )}

      {credential.notes && (
        <p className="text-gray-400 mt-2"><strong>Notes:</strong> <span className="text-gray-300">{credential.notes}</span></p>
      )}
    </div>
  );
};


export default function CustomerPortalCredentials() {
  const { customerPortalUser } = useAuth();
  const [credentials, setCredentials] = useState<CustomerCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCredentials = async () => {
      if (!customerPortalUser || !customerPortalUser.customer_id) {
        setError("No associated customer account found. Cannot fetch credentials.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getCustomerCredentials(customerPortalUser.customer_id);
        setCredentials(data);
      } catch (err: any) {
        console.error("Failed to fetch credentials:", err);
        setError("There was a problem retrieving your credentials. Please try again later.");
        toast.error("Failed to load credentials.");
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, [customerPortalUser]);

  if (loading) {
    return (
      <div className="text-center p-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-300">Loading your credentials...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-8 bg-red-900/20 border border-red-500 rounded-lg text-red-300">{error}</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Your Credentials</h1>
      {credentials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {credentials.map((cred) => (
            <CredentialCard key={cred.id} credential={cred} />
          ))}
        </div>
      ) : (
        <div className="text-center p-8 bg-gray-800/50 border border-gray-700 rounded-lg">
          <p className="text-gray-300">You do not have any credentials saved.</p>
          <p className="text-gray-400 mt-2">If you believe this is an error, please contact support.</p>
        </div>
      )}
    </div>
  );
};