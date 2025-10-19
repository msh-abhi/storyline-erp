import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Mail, Shield, CheckCircle } from 'lucide-react';

// A simple, self-contained toast notification component
const Toast: React.FC<{ message: string; show: boolean }> = ({ message, show }) => {
  return (
    <div
      className={`fixed top-5 right-5 flex items-center bg-green-500 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg transition-transform duration-300 ease-in-out ${show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <CheckCircle className="h-5 w-5 mr-2" />
      {message}
    </div>
  );
};

export default function LoginForm() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(email);
      setLinkSent(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000); // Hide toast after 3 seconds
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <Toast message="Magic link sent successfully!" show={showToast} />
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
            <Shield
                className="h-12 w-12 text-blue-600 mx-auto mb-4"
                strokeWidth={1.5}
            />
            <h1 className="text-3xl font-bold text-slate-900">
                {linkSent ? 'Check Your Inbox' : 'Admin Sign In'}
            </h1>
            <p className="text-slate-500 mt-2">
                {linkSent 
                    ? `A sign-in link has been sent to ${email}`
                    : 'Enter your email to receive a magic link to sign in.'}
            </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8">
          {!linkSent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600">Error: {error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
              >
                {loading ? 'Sending Link...' : 'Send Magic Link'}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-slate-600 mb-4">
                Click the link in the email to complete your sign-in. You can close this tab.
              </p>
              <button
                onClick={() => setLinkSent(false)}
                className="text-sm text-blue-600 hover:underline"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
                Secured by StoryLine ERP
            </p>
        </div>
      </div>
    </div>
  );
}
