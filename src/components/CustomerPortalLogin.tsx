import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { Mail, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CustomerPortalLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'link' | 'code'>('link');
  const [linkSent, setLinkSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const { magicLinkSignIn, authUser, customerPortalUser } = useAuth();
  const navigate = useNavigate();

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
      setMessage('Magic link og kode sendt! Tjek din email.');
      setLinkSent(true);
      setResendCooldown(60);
      setTimeout(() => setMode('code'), 1500);
    } else {
      setMessage(result.error || 'Kunne ikke sende magic link. Prøv igen.');
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
        setMessage('Verificeret! Omdirigerer...');
        setVerificationSuccess(true);

        setTimeout(() => {
          navigate('/portal/dashboard', { replace: true });
        }, 1500);
      }
    } catch (error: any) {
      setMessage(error.message || 'Ugyldig eller udløbet kode. Prøv igen.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (verificationSuccess && authUser && customerPortalUser) {
      navigate('/portal/dashboard', { replace: true });
    }
  }, [verificationSuccess, authUser, customerPortalUser, navigate]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    const redirectTo = `${window.location.origin}/portal/auth/callback`;
    const result = await magicLinkSignIn(email, redirectTo);

    if (result.success) {
      setMessage('Ny kode sendt! Tjek din email.');
      setResendCooldown(60);
    } else {
      setMessage(result.error || 'Kunne ikke gensende kode.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col lg:flex-row">
      {/* Left Column - Info (Desktop) / Header (Mobile) */}
      <div className="lg:w-5/12 bg-white lg:bg-gradient-to-br lg:from-blue-600 lg:to-purple-600 p-6 lg:p-12 flex flex-col justify-between">
        <div>
          {/* Logo/Brand */}
          <div className="mb-6 lg:mb-12">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 lg:text-white">Jysk-Streaming</h1>
            <p className="text-sm lg:text-base text-gray-600 lg:text-blue-100 mt-1">Kundeportal</p>
          </div>

          {/* Welcome Message - Mobile shows before form */}
          <div className="mb-6 lg:mb-12 lg:block">
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 lg:text-white mb-3">Velkommen tilbage</h2>
            <p className="text-sm lg:text-base text-gray-600 lg:text-blue-100 leading-relaxed">
              Log ind på din kundeportal for at administrere dine abonnementer,
              se dine oplysninger og få adgang til support.
            </p>
          </div>

          {/* Login Steps - Desktop only */}
          <div className="hidden lg:block mb-12">
            <h3 className="text-sm font-medium text-white mb-4">Sådan logger du ind:</h3>
            <ol className="space-y-3">
              <li className="flex items-start text-sm text-blue-100">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium text-white mr-3 mt-0.5">1</span>
                <span>Indtast din email-adresse</span>
              </li>
              <li className="flex items-start text-sm text-blue-100">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium text-white mr-3 mt-0.5">2</span>
                <span>Modtag en sikker login-kode via email</span>
              </li>
              <li className="flex items-start text-sm text-blue-100">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium text-white mr-3 mt-0.5">3</span>
                <span>Indtast koden eller klik på linket i emailen</span>
              </li>
            </ol>
          </div>

          {/* Support - Desktop only */}
          <div className="hidden lg:block border-t border-white/20 pt-8">
            <h3 className="text-sm font-medium text-white mb-3">Brug for hjælp?</h3>
            <div className="space-y-2 text-sm text-blue-100">
              <p>Email: <a href="mailto:kontakt@jysk-streaming.fun" className="text-white hover:underline">kontakt@jysk-streaming.fun</a></p>
              <p>WhatsApp: <a href="https://wa.me/4591624906" className="text-white hover:underline">+45 91624906</a></p>
            </div>
          </div>
        </div>

        {/* Footer - Desktop only */}
        <div className="hidden lg:block text-xs text-blue-200">
          © 2026 Jysk-Streaming. Alle rettigheder forbeholdes.
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 border border-gray-100">
            {/* Form Header */}
            <div className="mb-6">
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900">Log ind</h2>
              <p className="text-sm text-gray-500 mt-2">
                Indtast din email for at modtage en login-kode
              </p>
            </div>

            {/* Tab Selector */}
            <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setMode('link')}
                className={`flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition-all ${mode === 'link'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Magic Link
              </button>
              <button
                onClick={() => setMode('code')}
                disabled={!linkSent}
                className={`flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition-all ${mode === 'code'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm'
                    : linkSent ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 cursor-not-allowed'
                  }`}
              >
                Indtast Kode
              </button>
            </div>

            {/* Email Input */}
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email-adresse
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                  placeholder="din@email.dk"
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
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg"
                  disabled={loading || !email}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sender...
                    </>
                  ) : (
                    <>
                      Send Login-kode
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Success Message */}
            {linkSent && mode === 'link' && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-900 mb-1">Email sendt!</p>
                <p className="text-sm text-green-700">
                  Tjek din indbakke for login-linket og 6-cifret kode.
                </p>
                <button
                  onClick={() => setMode('code')}
                  className="mt-3 text-sm text-green-700 font-medium underline hover:text-green-900"
                >
                  Indtast koden manuelt →
                </button>
              </div>
            )}

            {/* OTP Code Mode */}
            {mode === 'code' && linkSent && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                    6-cifret kode
                  </label>
                  <input
                    type="text"
                    id="otp"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-center text-2xl font-mono tracking-widest"
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
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg"
                  disabled={loading || otpCode.length !== 6}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Verificerer...
                    </>
                  ) : (
                    <>
                      Verificer Kode
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
                    className="text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {resendCooldown > 0 ? (
                      `Gensend kode om ${resendCooldown}s`
                    ) : (
                      'Gensend kode'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Message Display */}
            {message && !linkSent && (
              <div className={`mt-4 p-3 rounded-lg text-sm border-2 ${message.includes('sendt') || message.includes('Verificeret')
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                {message}
              </div>
            )}

            {mode === 'code' && message && linkSent && (
              <div className={`mt-4 p-3 rounded-lg text-sm border-2 ${message.includes('Verificeret') || message.includes('sendt')
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                {message}
              </div>
            )}
          </div>

          {/* Mobile Support */}
          <div className="lg:hidden mt-6 text-center">
            <p className="text-xs text-gray-500 mb-3 font-medium">Brug for hjælp?</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p>Email: <a href="mailto:kontakt@jysk-streaming.fun" className="text-blue-600 hover:underline font-medium">kontakt@jysk-streaming.fun</a></p>
              <p>WhatsApp: <a href="https://wa.me/4591624906" className="text-blue-600 hover:underline font-medium">+45 91624906</a></p>
            </div>
            <p className="text-xs text-gray-400 mt-4">© 2026 Jysk-Streaming</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortalLogin;
