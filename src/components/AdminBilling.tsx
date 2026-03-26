import React, { useEffect, useState, useCallback } from 'react';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  RefreshCw,
  Shield,
  Zap,
  Wrench,
  ChevronRight,
  Star,
  ArrowRight,
  Receipt,
  BadgeCheck,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface AdminSubscription {
  id: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'unpaid';
  plan_core: boolean;
  plan_maintenance: boolean;
  monthly_amount: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  paypal_subscription_id?: string;
  paypal_order_id?: string;
  payment_gateway?: 'stripe' | 'paypal' | 'manual';
  current_period_start?: string;
  current_period_end?: string;
  next_billing_date?: string;
  trial_end?: string;
  canceled_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface AdminBillingTransaction {
  id: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  core_amount: number;
  maintenance_amount: number;
  gateway: 'stripe' | 'paypal' | 'manual';
  gateway_tx_id?: string;
  gateway_invoice_id?: string;
  gateway_receipt_url?: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  period_start?: string;
  period_end?: string;
  includes_maintenance: boolean;
  description?: string;
  created_at: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const fmt = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const statusColor = (s: AdminSubscription['status']) => {
  switch (s) {
    case 'active': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'trialing': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'past_due': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'canceled': return 'text-slate-500 bg-slate-50 border-slate-200';
    case 'unpaid': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';
  }
};

const statusIcon = (s: AdminSubscription['status']) => {
  switch (s) {
    case 'active': return <BadgeCheck className="w-4 h-4" />;
    case 'trialing': return <Clock className="w-4 h-4" />;
    case 'past_due': return <AlertTriangle className="w-4 h-4" />;
    case 'canceled': return <XCircle className="w-4 h-4" />;
    case 'unpaid': return <XCircle className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

const txStatusBadge = (s: AdminBillingTransaction['status']) => {
  switch (s) {
    case 'succeeded': return 'bg-emerald-100 text-emerald-700';
    case 'pending': return 'bg-amber-100 text-amber-700';
    case 'failed': return 'bg-red-100 text-red-700';
    case 'refunded': return 'bg-slate-100 text-slate-600';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const gatewayLogo = (gw?: string) => {
  if (gw === 'stripe') return (
    <span className="inline-flex items-center gap-1 text-[#635BFF] font-semibold text-xs">
      <CreditCard className="w-3.5 h-3.5" /> Stripe
    </span>
  );
  if (gw === 'paypal') return (
    <span className="inline-flex items-center gap-1 text-[#003087] font-semibold text-xs">
      <span className="w-3.5 h-3.5 font-bold text-[#009cde] leading-none">P</span>
      PayPal
    </span>
  );
  return <span className="text-xs text-slate-500">Manual</span>;
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const AdminBilling: React.FC = () => {
  const [subscription, setSubscription] = useState<AdminSubscription | null>(null);
  const [transactions, setTransactions] = useState<AdminBillingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<'stripe' | 'paypal' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeMaintenance, setIncludeMaintenance] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  // Check URL params for return from gateway
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing_success') === '1') {
      const gateway = params.get('gateway');
      const token = params.get('token'); // PayPal order token
      // session_id (Stripe) is not needed client-side – webhook handles sync

      // If PayPal: capture the order
      if (gateway === 'paypal' && token) {
        handlePayPalCapture(token);
      }

      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('billing_success');
      url.searchParams.delete('session_id');
      url.searchParams.delete('gateway');
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.toString());
    }

    if (params.get('billing_canceled') === '1') {
      setError('Payment canceled. You can try again whenever you are ready.');
      const url = new URL(window.location.href);
      url.searchParams.delete('billing_canceled');
      url.searchParams.delete('gateway');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subRes, txRes] = await Promise.all([
        supabase
          .from('admin_subscription')
          .select('*')
          .limit(1)
          .single(),
        supabase
          .from('admin_billing_transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (subRes.data) setSubscription(subRes.data as AdminSubscription);
      if (txRes.data) setTransactions(txRes.data as AdminBillingTransaction[]);
    } catch (err) {
      console.error('AdminBilling: fetchData error', err);
      setError('Failed to load billing data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sync maintenance checkbox with current subscription
  useEffect(() => {
    if (subscription) {
      setIncludeMaintenance(subscription.plan_maintenance);
    }
  }, [subscription]);

  const handleStripeCheckout = async () => {
    setCheckoutLoading('stripe');
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;

      const res = await fetch('/api/billing/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeMaintenance, customerEmail: email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout');
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Stripe checkout failed. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePayPalCheckout = async () => {
    setCheckoutLoading('paypal');
    setError(null);
    try {
      const res = await fetch('/api/billing/paypal-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeMaintenance }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start PayPal checkout');
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'PayPal checkout failed. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePayPalCapture = async (orderId: string) => {
    try {
      await fetch('/api/billing/paypal-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, includeMaintenance }),
      });
      // Reload data to reflect new payment
      setTimeout(() => fetchData(), 1500);
    } catch (err) {
      console.error('PayPal capture error:', err);
    }
  };

  const totalMonthly = includeMaintenance ? 8800 : 5900;

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading billing information...</p>
        </div>
      </div>
    );
  }

  const isActive = subscription?.status === 'active';
  const isPastDue = subscription?.status === 'past_due';
  const isUnpaid = subscription?.status === 'unpaid';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            Subscription & Billing
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage your JyskStream ERP retainer — powering your Supabase, automations & Netlify infrastructure.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Subscription Status Card ── */}
      {subscription && (
        <div className={`rounded-2xl border-2 p-6 ${isActive ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50' : isPastDue || isUnpaid ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${statusColor(subscription.status)}`}>
                  {statusIcon(subscription.status)}
                  {subscription.status.replace('_', ' ').toUpperCase()}
                </span>
                {subscription.payment_gateway && (
                  <span className="text-xs text-slate-500">via {gatewayLogo(subscription.payment_gateway)}</span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                {isActive ? '✅ Your subscription is active' : isPastDue ? '⚠️ Payment past due' : isUnpaid ? '🔴 Payment required' : '⏳ Awaiting first payment'}
              </h2>
              {isActive && (
                <p className="text-slate-600 text-sm mt-1">
                  Next renewal: <strong>{fmtDate(subscription.next_billing_date || subscription.current_period_end)}</strong>
                </p>
              )}
              {(isPastDue || isUnpaid) && (
                <p className="text-amber-700 text-sm mt-1 font-medium">
                  Please complete payment to restore full access.
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-slate-800">
                {fmt(subscription.monthly_amount)}
              </div>
              <div className="text-slate-500 text-sm">/month</div>
            </div>
          </div>

          {/* Plan breakdown */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-slate-700 border border-slate-200 shadow-sm">
              <Shield className="w-3.5 h-3.5 text-blue-500" /> Core Plan — $59/mo
            </span>
            {subscription.plan_maintenance && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-slate-700 border border-slate-200 shadow-sm">
                <Wrench className="w-3.5 h-3.5 text-purple-500" /> Maintenance — $29/mo
              </span>
            )}
          </div>

          {/* Period */}
          {subscription.current_period_start && subscription.current_period_end && (
            <p className="mt-3 text-xs text-slate-500">
              Current period: {fmtDate(subscription.current_period_start)} → {fmtDate(subscription.current_period_end)}
            </p>
          )}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex border-b border-gray-200">
        {(['overview', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab === 'overview' ? '📋 Plan Overview' : '🧾 Payment History'}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════ OVERVIEW TAB ═══════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* ── Plan Selector ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4" /> Configure Your Plan
              </h3>
              <p className="text-blue-100 text-xs mt-0.5">Select add-ons and choose your payment method.</p>
            </div>
            <div className="p-6 space-y-5">

              {/* Core plan (always included) */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-800">Core Subscription</h4>
                      <p className="text-slate-500 text-xs mt-0.5">App management, Supabase, Netlify & backend automations</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-800">$59<span className="text-sm font-normal text-slate-500">/mo</span></div>
                      <span className="text-xs text-emerald-600 font-medium">Always included</span>
                    </div>
                  </div>
                  <ul className="mt-3 grid grid-cols-2 gap-y-1 gap-x-4">
                    {['Supabase database hosting', 'Netlify deployment', 'Backend automations', 'Cloud infrastructure'].map(f => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Maintenance add-on toggle */}
              <div
                onClick={() => setIncludeMaintenance(!includeMaintenance)}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${includeMaintenance ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-50/40'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${includeMaintenance ? 'bg-purple-600' : 'bg-gray-300'}`}>
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-800">Maintenance Add-on</h4>
                      <p className="text-slate-500 text-xs mt-0.5">Updates, bug fixes & priority technical support</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-800">$29<span className="text-sm font-normal text-slate-500">/mo</span></div>
                      <div className={`mt-1 w-12 h-6 rounded-full transition-colors ml-auto flex items-center px-1 ${includeMaintenance ? 'bg-purple-600 justify-end' : 'bg-gray-300 justify-start'}`}>
                        <div className="w-4 h-4 bg-white rounded-full shadow" />
                      </div>
                    </div>
                  </div>
                  <ul className="mt-3 grid grid-cols-2 gap-y-1 gap-x-4">
                    {['Feature updates', 'Bug fixes', 'Priority support', 'Code reviews'].map(f => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${includeMaintenance ? 'text-purple-500' : 'text-gray-400'}`} />{f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-800 rounded-xl text-white">
                <span className="font-medium">Monthly Total</span>
                <div className="text-right">
                  <span className="text-2xl font-black">{fmt(totalMonthly)}</span>
                  <span className="text-slate-300 text-sm">/month</span>
                </div>
              </div>

              {/* ── Payment Buttons ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Stripe */}
                <button
                  onClick={handleStripeCheckout}
                  disabled={checkoutLoading !== null}
                  className="relative group flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#635BFF] to-[#4F48E2] hover:from-[#4F48E2] hover:to-[#3d36cc] text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {checkoutLoading === 'stripe' ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CreditCard className="w-5 h-5" />
                  )}
                  <div className="text-left">
                    <div className="text-sm font-bold">Pay with Stripe</div>
                    <div className="text-xs text-purple-200">Cards, Apple & Google Pay</div>
                  </div>
                  <ChevronRight className="w-4 h-4 ml-auto opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* PayPal */}
                <button
                  onClick={handlePayPalCheckout}
                  disabled={checkoutLoading !== null}
                  className="relative group flex items-center justify-center gap-3 px-6 py-4 bg-[#FFD140] hover:bg-[#F5C800] text-[#003087] rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none border border-[#F5C800]"
                >
                  {checkoutLoading === 'paypal' ? (
                    <div className="w-5 h-5 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-[#009cde] font-black text-lg leading-none">P</span>
                  )}
                  <div className="text-left">
                    <div className="text-sm font-bold text-[#003087]">Pay with PayPal</div>
                    <div className="text-xs text-[#003087]/70">PayPal balance or bank</div>
                  </div>
                  <ChevronRight className="w-4 h-4 ml-auto opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Payments are processed securely. Cancel anytime.
              </p>
            </div>
          </div>

          {/* ── What's Covered ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: <Zap className="w-5 h-5 text-blue-500" />,
                title: 'Core Infrastructure',
                items: ['Supabase Pro hosting', 'Netlify deployment', 'CDN & edge network', 'Daily backups'],
              },
              {
                icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
                title: 'Automations',
                items: ['Edge functions runtime', 'Cron jobs & heartbeat', 'Email delivery (Brevo)', 'Webhook processing'],
              },
              {
                icon: <Star className="w-5 h-5 text-amber-500" />,
                title: 'Maintenance (Add-on)',
                items: ['Feature updates', 'Bug fixes & patches', 'Priority response', 'Monthly code review'],
              },
            ].map(card => (
              <div key={card.title} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  {card.icon}
                  <h4 className="font-semibold text-slate-700 text-sm">{card.title}</h4>
                </div>
                <ul className="space-y-1.5">
                  {card.items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ HISTORY TAB ═══════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-500" />
              Payment History
            </h3>
            <span className="text-xs text-slate-400">{transactions.length} record{transactions.length !== 1 ? 's' : ''}</span>
          </div>

          {transactions.length === 0 ? (
            <div className="py-20 text-center">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No payment records yet</p>
              <p className="text-slate-400 text-sm mt-1">Your payment history will appear here after the first successful payment.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <div key={tx.id} className="px-6 py-4 flex flex-wrap items-center gap-3">
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${tx.status === 'succeeded' ? 'bg-emerald-500' : tx.status === 'failed' ? 'bg-red-500' : tx.status === 'pending' ? 'bg-amber-400' : 'bg-slate-400'}`} />

                  {/* Description + date */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {tx.description || 'Monthly ERP Retainer'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{fmtDate(tx.created_at)}</span>
                      {gatewayLogo(tx.gateway)}
                      {tx.includes_maintenance && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">+ Maintenance</span>
                      )}
                    </div>
                    {tx.period_start && tx.period_end && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Period: {fmtDate(tx.period_start)} → {fmtDate(tx.period_end)}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <div className="font-bold text-slate-800">{fmt(tx.amount)}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${txStatusBadge(tx.status)}`}>
                      {tx.status}
                    </span>
                  </div>

                  {/* Receipt link */}
                  {tx.gateway_receipt_url && (
                    <a
                      href={tx.gateway_receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View Receipt"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2.5 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Receipt
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Support Note ── */}
      <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Questions about billing?</p>
          <p className="text-slate-300 text-xs mt-0.5">Contact your developer Shohrab at Tecnomaxx Digital Ltd.</p>
        </div>
        <a
          href="mailto:shohrab@tecnomaxxdigital.com"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors border border-white/20"
        >
          <ArrowRight className="w-4 h-4" /> Contact Support
        </a>
      </div>
    </div>
  );
};

export default AdminBilling;
