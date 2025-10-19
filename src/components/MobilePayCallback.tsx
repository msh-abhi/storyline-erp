
import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

// A custom hook to parse query parameters
const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const MobilePayCallback: React.FC = () => {
  const query = useQuery();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // MobilePay typically redirects with query parameters indicating success or failure.
    // The exact parameters depend on the MobilePay API version and the flow.
    // We'll check for a common parameter like 'status' or 'error'.
    // This is a simplified example. You should consult the MobilePay documentation for the exact callback format.

    const agreementStatus = query.get('status'); // Example: ?status=success
    const agreementId = query.get('agreement_id'); // Example: ?agreement_id=some_id
    const errorMessage = query.get('error_message'); // Example: ?error_message=user_cancelled

    if (errorMessage) {
      setStatus('failed');
      setError(errorMessage);
    } else if (agreementStatus === 'success' && agreementId) {
      setStatus('success');
      // Here you would typically make a call to your backend to verify the agreement status
      // with the MobilePay API to prevent tampering with the URL parameters.
      // For this example, we'll assume the redirect is trustworthy.
      console.log(`Successfully set up MobilePay agreement: ${agreementId}`);
    } else {
      setStatus('failed');
      setError('Invalid callback parameters received from MobilePay.');
    }
  }, [query]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <h1 className="text-2xl font-bold mb-4">Verifying MobilePay Agreement...</h1>
            <p className="text-gray-600">Please wait while we process the information from MobilePay.</p>
            {/* You can add a spinner here */}
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className="text-2xl font-bold text-green-600 mb-4">Agreement Set Up Successfully!</h1>
            <p className="text-gray-700 mb-6">
              Your recurring payment agreement with MobilePay has been confirmed.
            </p>
            <Link to="/settings" className="text-blue-500 hover:underline">Return to Settings</Link>
          </>
        )}
        {status === 'failed' && (
          <>
            <h1 className="text-2xl font-bold text-red-600 mb-4">Agreement Setup Failed</h1>
            <p className="text-gray-700 mb-2">There was a problem setting up your MobilePay agreement.</p>
            {error && <p className="text-red-500 bg-red-100 p-3 rounded"><strong>Error:</strong> {error}</p>}
            <Link to="/settings" className="mt-6 inline-block text-blue-500 hover:underline">Try Again from Settings</Link>
          </>
        )}
      </div>
    </div>
  );
};

export default MobilePayCallback;
