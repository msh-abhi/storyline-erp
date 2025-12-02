import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { getCustomerCredentials } from '../services/supabaseService';
import { CustomerCredential } from '../types';
import { toast } from 'react-toastify';
import { Tv } from 'lucide-react';

// A simple component to display a single credential securely
const CredentialCard = ({ credential }: { credential: CustomerCredential }) => {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <div className="bg-blue-100 p-6 rounded-xl shadow-lg border border-blue-200/80 space-y-4 transition-all duration-300 hover:shadow-xl hover:border-blue-500">
      <h3 className="text-2xl font-bold text-blue-800 truncate">{credential.server_url}</h3>
      
      <div className="space-y-3 pt-2">
        <p className="text-blue-900 flex justify-between">
          <strong className="font-medium">User Name:</strong>
          <span className="font-mono text-blue-900 bg-blue-200 px-2 py-1 rounded-md">{credential.server_id}</span>
        </p>

        {credential.mac_address && (
          <p className="text-blue-900 flex justify-between">
            <strong className="font-medium">MAC Address:</strong>
            <span className="font-mono text-blue-900 bg-blue-200 px-2 py-1 rounded-md">{credential.mac_address}</span>
          </p>
        )}

        {credential.password && (
          <div className="flex items-center justify-between">
            <p className="text-blue-900 font-medium"><strong>Password:</strong></p>
            <div className="flex items-center gap-3">
              <span className={`font-mono text-blue-900 bg-blue-200 px-2 py-1 rounded-md ${!passwordVisible ? 'blur-sm' : ''}`}>
                {passwordVisible ? credential.password : '************'}
              </span>
              <button
                onClick={() => setPasswordVisible(!passwordVisible)}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
              >
                {passwordVisible ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        )}

        {credential.expires_at && (
           <p className="text-blue-900 flex justify-between">
            <strong className="font-medium">Expires:</strong>
            <span className="text-blue-900 font-medium">{new Date(credential.expires_at).toLocaleDateString()}</span>
          </p>
        )}
      </div>

      {credential.notes && (
        <div className="pt-4 border-t border-blue-200/80">
          <p className="text-blue-900 font-medium">Notes:</p>
          <p className="text-blue-800 mt-1">{credential.notes}</p>
        </div>
      )}
    </div>
  );
};


export default function CustomerPortalCredentials() {
  const { customerPortalUser } = useAuth();
  const [credentials, setCredentials] = useState<CustomerCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use type assertion to access the camelCase properties after keysToCamel conversion
  const portalUser = customerPortalUser as any;
  const hasCustomer = portalUser?.customerId && portalUser?.customerId !== null;

  useEffect(() => {
    const fetchCredentials = async () => {
      if (!customerPortalUser || !hasCustomer) {
        setError("No customer account is found for this user.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getCustomerCredentials(portalUser.customerId);
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
      <div className="text-center p-12">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600 font-medium">Loading...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-8 bg-red-100 border border-red-400 rounded-lg text-red-700">{error}</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Your Credentials</h1>
      {credentials.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {credentials.map((cred) => (
            <CredentialCard key={cred.id} credential={cred} />
          ))}
        </div>
      ) : (
        <div className="text-center p-12 bg-white border-2 border-dashed border-gray-300 rounded-xl">
          <Tv size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-medium text-gray-800">No credentials found.</h3>
          <p className="text-gray-500 mt-2">If you believe this is an error, please contact support.</p>
        </div>
      )}
    </div>
  );
};