import React from 'react';
import { Mail } from 'lucide-react';

const CheckEmail: React.FC = () => {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center">
        <Mail className="w-16 h-16 text-blue-600 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Check Your Email</h2>
        <p className="text-gray-600 mb-6">
          We've sent a magic link to your email address. Click the link in the email to securely log in to your customer portal.
        </p>
        <p className="text-sm text-gray-500">
          If you don't see it, please check your spam folder.
        </p>
      </div>
    </div>
  );
};

export default CheckEmail;