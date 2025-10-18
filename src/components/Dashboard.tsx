import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  Store,
  AlertCircle,
  Code,
  Tv,
  ShoppingCart,
  CreditCard,
  FileText,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ActiveSection, Sale, Reseller, Subscription, Invoice, ExchangeRates } from '../types';
import {
  calculateTotalRevenue,
  calculateOutstandingReceivables,
  calculateTotalExpenses,
  calculateOutstandingPayables,
  calculateInventoryProfit,
  calculateInventoryValue,
  formatCurrency
} from '../utils/calculations';
import ProfitOverview from './ProfitOverview';

interface DashboardProps {
  onSectionChange: (section: ActiveSection) => void;
}

export default function Dashboard({ onSectionChange }: DashboardProps) {
  const { state } = useApp();

  const totalRevenue = calculateTotalRevenue(state.sales);
  const outstandingReceivables = calculateOutstandingReceivables(state.resellers);
  const totalExpenses = calculateTotalExpenses(state.purchases);
  const inventoryProfit = calculateInventoryProfit(state.sales);
  const inventoryValue = calculateInventoryValue(state.digitalCodes, state.tvBoxes);
  const netProfit = totalRevenue - totalExpenses;

  // Calculate subscription revenue
  const subscriptionRevenue = state.subscriptions?.reduce((total: number, sub: Subscription) =>
    sub.status === 'active' ? total + sub.price : total, 0
  ) || 0;

  // Calculate reseller credit profit
  const resellerCreditProfit = state.resellers.reduce((total: number, reseller: Reseller) =>
    total + (reseller.outstandingBalance || 0), 0
  );

  // Calculate outstanding payments from sales
  const outstandingFromSales = state.sales
    .filter((sale: Sale) => sale.paymentStatus === 'due')
    .reduce((total: number, sale: Sale) => total + sale.totalPrice, 0);

  // New: Calculate invoice-related metrics
  const totalInvoicedAmount = state.invoices.reduce((total: number, inv: Invoice) => total + inv.amount, 0);
  const totalPaidInvoices = state.invoices.filter((inv: Invoice) => inv.status === 'paid').reduce((total: number, inv: Invoice) => total + inv.amount, 0);
  const totalPendingInvoices = state.invoices.filter((inv: Invoice) => inv.status === 'pending').reduce((total: number, inv: Invoice) => total + inv.amount, 0);
  const totalOutstandingPayables = calculateOutstandingPayables(state.suppliers);


  const displayCurrency = state.settings?.currency || 'DKK';

  const quickActions = [
    {
      title: 'Add Digital Code',
      description: 'Add new digital product',
      icon: Code,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: () => onSectionChange('digital-codes')
    },
    {
      title: 'Add TV Box',
      description: 'Add to inventory',
      icon: Tv,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      action: () => onSectionChange('tv-boxes')
    },
    {
      title: 'Record Sale',
      description: 'Log new transaction',
      icon: ShoppingCart,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      action: () => onSectionChange('sales')
    },
    {
      title: 'Record Purchase',
      description: 'Log supplier purchase',
      icon: CreditCard,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      action: () => onSectionChange('purchases')
    }
  ];

  const stats = [
    {
      title: 'Total Revenue',
      value: formatCurrency(totalRevenue + subscriptionRevenue + totalPaidInvoices, 'DKK', state.exchangeRates, displayCurrency),
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      change: '+12.5%',
      changeType: 'positive'
    },
    {
      title: 'Net Profit',
      value: formatCurrency(netProfit + inventoryProfit + resellerCreditProfit, 'DKK', state.exchangeRates, displayCurrency),
      icon: netProfit >= 0 ? TrendingUp : TrendingDown,
      color: netProfit >= 0 ? 'text-emerald-600' : 'text-red-600',
      bgColor: netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50',
      change: netProfit >= 0 ? '+8.2%' : '-3.1%',
      changeType: netProfit >= 0 ? 'positive' : 'negative'
    },
    {
      title: 'Outstanding Receivables',
      value: formatCurrency(outstandingReceivables + outstandingFromSales + totalPendingInvoices, 'DKK', state.exchangeRates, displayCurrency),
      icon: AlertCircle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      change: '-5.3%',
      changeType: 'positive'
    },
    {
      title: 'Outstanding Payables',
      value: formatCurrency(totalOutstandingPayables, 'DKK', state.exchangeRates, displayCurrency),
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      change: '+2.1%',
      changeType: 'negative'
    },
    {
      title: 'Inventory Value',
      value: formatCurrency(inventoryValue, 'DKK', state.exchangeRates, displayCurrency),
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+15.7%',
      changeType: 'positive'
    },
    {
      title: 'Monthly Subscription Revenue',
      value: formatCurrency(subscriptionRevenue, 'DKK', state.exchangeRates, displayCurrency),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      change: '+22.4%',
      changeType: 'positive'
    },
    { // New Stat Card: Total Invoiced
      title: 'Total Invoiced',
      value: formatCurrency(totalInvoicedAmount, 'DKK', state.exchangeRates, displayCurrency),
      icon: FileText,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      change: '+10.0%',
      changeType: 'positive'
    },
    { // New Stat Card: Paid Invoices
      title: 'Paid Invoices',
      value: formatCurrency(totalPaidInvoices, 'DKK', state.exchangeRates, displayCurrency),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+8.0%',
      changeType: 'positive'
    },
    { // New Stat Card: Pending Invoices
      title: 'Pending Invoices',
      value: formatCurrency(totalPendingInvoices, 'DKK', state.exchangeRates, displayCurrency),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      change: '-2.0%',
      changeType: 'negative'
    }
  ];

  const entityCounts = [
    { title: 'Customers', count: state.customers.length, icon: Users, color: 'text-blue-600' },
    { title: 'Resellers', count: state.resellers.length, icon: Store, color: 'text-emerald-600' },
    { title: 'Suppliers', count: state.suppliers.length, icon: Package, color: 'text-amber-600' },
    { title: 'Digital Codes', count: state.digitalCodes.length, icon: Code, color: 'text-blue-600' },
    { title: 'TV Boxes', count: state.tvBoxes.length, icon: Tv, color: 'text-emerald-600' },
    { title: 'Sales', count: state.sales.length, icon: ShoppingCart, color: 'text-amber-600' },
    { title: 'Purchases', count: state.purchases.length, icon: CreditCard, color: 'text-red-600' },
    { title: 'Invoices', count: state.invoices.length, icon: FileText, color: 'text-indigo-600' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
        <div className="flex items-center justify-between">
          <p className="text-slate-600 mt-2">Overview of your business performance</p>
          {state.exchangeRates && (
            <div className="text-sm text-slate-500">
              Exchange rates: {new Date((state.exchangeRates as ExchangeRates).lastUpdated).toLocaleString()}
              {!(state.exchangeRates as ExchangeRates).success && (
                <span className="text-amber-600 ml-2">(Fallback rates)</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-200/60 mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className="p-4 border border-slate-200/60 rounded-xl hover:bg-slate-50/80 transition-all duration-200 text-left hover:shadow-md backdrop-blur-sm group"
              >
                <div className={`w-10 h-10 ${action.bgColor} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <p className="font-medium text-slate-900">{action.title}</p>
                <p className="text-sm text-slate-600">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    <span className={`text-sm font-medium ${
                      stat.changeType === 'positive' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-slate-500 ml-1">vs last month</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Entity Counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
        {entityCounts.map((entity, index) => {
          const Icon = entity.icon;
          return (
            <div key={index} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-200">
              <div className="flex flex-col items-center text-center space-y-2">
                <Icon className={`h-6 w-6 ${entity.color}`} />
                <div>
                  <p className="text-xl font-bold text-slate-900">{entity.count}</p>
                  <p className="text-xs text-slate-600">{entity.title}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Profit Overview */}
      <ProfitOverview />
    </div>
  );
}
