import React, { useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { Mail, Shield, KeyRound, Sparkles, ArrowRight, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CustomerPortalLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'link' | 'code'>('link');
  const [linkSent, setLinkSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { magicLinkSignIn } = useAuth();

  // Cooldown timer for resend
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const redirectTo = `${window.location.origin}/portal/auth/callback`;
    const result = await magicLinkSignIn(email, redirectTo);

    if (result.success) {
      setMessage('Magic link and OTP code sent! Check your email.');
      setLinkSent(true);
      setResendCooldown(60);
      // Auto-switch to code mode after sending
      setTimeout(() => setMode('code'), 1500);
    } else {
      setMessage(result.error || 'Failed to send magic link. Please try again.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email'
      });

      if (error) throw error;

      if (data.session) {
        setMessage('Successfully verified! Redirecting...');
        // Use window.location.href for reliable redirect after auth
        setTimeout(() => {
          window.location.href = '/portal/dashboard';
        }, 1000);
      }
    } catch (error: any) {
      setMessage(error.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    const redirectTo = `${window.location.origin}/portal/auth/callback`;
    const result = await magicLinkSignIn(email, redirectTo);

    if (result.success) {
      setMessage('New code sent! Check your email.');
      setResendCooldown(60);
    } else {
      setMessage(result.error || 'Failed to resend code.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Customer Portal
          </h1>
          <p className="text-gray-600 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Secure access to your account
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
          {/* Tab Selector */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setMode('link')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${mode === 'link'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Mail className="w-4 h-4" />
              Magic Link
            </button>
            <button
              onClick={() => setMode('code')}
              disabled={!linkSent}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${mode === 'code'
                ? 'bg-white text-purple-600 shadow-sm'
                : linkSent ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 cursor-not-allowed'
                }`}
            >
              <KeyRound className="w-4 h-4" />
              Enter Code
            </button>
          </div>

          {/* Email Input (always visible) */}
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                id="email"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || linkSent}
              />
            </div>
          </div>

          {/* Magic Link Mode */}
          {mode === 'link' && !linkSent && (
            <form onSubmit={handleSendLink}>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={loading || !email}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    Send Magic Link
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Success Message for Link Sent */}
          {linkSent && mode === 'link' && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-900 mb-1">Email Sent!</p>
                  <p className="text-sm text-green-700">
                    Check your inbox for the magic link and 6-digit code.
                  </p>
                  <button
                    onClick={() => setMode('code')}
                    className="mt-2 text-sm text-green-700 underline hover:text-green-900"
                  >
                    Or enter the code manually →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OTP Code Mode */}
          {mode === 'code' && linkSent && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-semibold text-gray-700 mb-2">
                  6-Digit Code
                </label>
                <input
                  type="text"
                  id="otp"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-center text-2xl font-mono tracking-widest"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={loading || otpCode.length !== 6}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify Code
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Resend Code */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? (
                    `Resend code in ${resendCooldown}s`
                  ) : (
                    'Resend code'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Message Display */}
          {message && !linkSent && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${message.includes('sent') || message.includes('Success')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
              {message}
            </div>
          )}

          {mode === 'code' && message && linkSent && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${message.includes('Success') || message.includes('sent')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
              {message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Secured by JyskStream Portal
          </p>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default CustomerPortalLogin;
