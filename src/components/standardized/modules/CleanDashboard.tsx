import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  ShoppingCart,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
  TrendingDown as TrendingDownIcon
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { ActiveSection } from '../../../types';
import {
  calculateTotalRevenue,
  calculateOutstandingReceivables,
  calculateTotalExpenses,
  calculateOutstandingPayables,
  calculateInventoryValue,
  formatCurrency,
  calculateSubscriptionRevenue,
  calculateTotalInvoicedAmount,
  calculateTotalPaidInvoices,
  calculateTotalPendingInvoices,
  calculateNetProfit,
  calculateOutstandingFromSales
} from '../../../utils/calculations';
import ProfitOverview from '../../ProfitOverview';

interface DashboardProps {
  onSectionChange: (section: ActiveSection) => void;
}

const CleanDashboard: React.FC<DashboardProps> = ({ onSectionChange }) => {
  const { state } = useApp();

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Core financial calculations
  const totalRevenue = calculateTotalRevenue(state.sales || []);
  const totalExpenses = calculateTotalExpenses(state.purchases || []);
  const netProfit = calculateNetProfit(totalRevenue, totalExpenses);
  const subscriptionRevenue = calculateSubscriptionRevenue(state.subscriptions || []);
  const totalInvoiced = calculateTotalInvoicedAmount(state.invoices || []);
  const totalPaid = calculateTotalPaidInvoices(state.invoices || []);
  const totalPending = calculateTotalPendingInvoices(state.invoices || []);
  const inventoryValue = calculateInventoryValue(state.digitalCodes || [], state.tvBoxes || []);
  const outstandingReceivables = calculateOutstandingReceivables(state.resellers || []);
  const outstandingFromSales = calculateOutstandingFromSales(state.sales || []);
  const totalOutstandingPayables = calculateOutstandingPayables(state.suppliers || []);

  const displayCurrency = state.settings?.currency || 'DKK';

  // Streamlined quick actions
  const quickActions = [
    {
      title: 'Record Sale',
      description: 'Log new transaction',
      icon: ShoppingCart,
      action: () => onSectionChange('sales'),
      color: 'text-blue-600 bg-blue-50 hover:bg-blue-100'
    },
    {
      title: 'Add Customer',
      description: 'Register new client',
      icon: Users,
      action: () => onSectionChange('customers'),
      color: 'text-green-600 bg-green-50 hover:bg-green-100'
    },
    {
      title: 'Manage Inventory',
      description: 'Update stock items',
      icon: Package,
      action: () => onSectionChange('digital-codes'),
      color: 'text-purple-600 bg-purple-50 hover:bg-purple-100'
    },
    {
      title: 'View Reports',
      description: 'Generate insights',
      icon: FileText,
      action: () => onSectionChange('analytics'),
      color: 'text-orange-600 bg-orange-50 hover:bg-orange-100'
    }
  ];

  // Key metrics - comprehensive financial dashboard
  const coreMetrics = [
    {
      title: 'Total Revenue',
      value: formatCurrency(totalRevenue + subscriptionRevenue + totalPaid, 'DKK', state.exchangeRates, displayCurrency),
      icon: DollarSign,
      trend: netProfit >= 0 ? 'up' : 'down'
    },
    {
      title: 'Net Profit',
      value: formatCurrency(netProfit, 'DKK', state.exchangeRates, displayCurrency),
      icon: netProfit >= 0 ? TrendingUp : TrendingDown,
      trend: netProfit >= 0 ? 'up' : 'down'
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(totalExpenses, 'DKK', state.exchangeRates, displayCurrency),
      icon: TrendingDownIcon,
      trend: 'negative'
    },
    {
      title: 'Outstanding Receivables',
      value: formatCurrency(outstandingReceivables + outstandingFromSales + totalPending, 'DKK', state.exchangeRates, displayCurrency),
      icon: AlertCircle,
      trend: 'attention'
    },
    {
      title: 'Outstanding Payables',
      value: formatCurrency(totalOutstandingPayables, 'DKK', state.exchangeRates, displayCurrency),
      icon: AlertCircle,
      trend: 'warning'
    },
    {
      title: 'Inventory Value',
      value: formatCurrency(inventoryValue, 'DKK', state.exchangeRates, displayCurrency),
      icon: Package,
      trend: 'stable'
    },
    {
      title: 'Total Invoiced',
      value: formatCurrency(totalInvoiced, 'DKK', state.exchangeRates, displayCurrency),
      icon: FileText,
      trend: 'up'
    },
    {
      title: 'Paid Invoices',
      value: formatCurrency(totalPaid, 'DKK', state.exchangeRates, displayCurrency),
      icon: CheckCircle,
      trend: 'positive'
    },
    {
      title: 'Pending Invoices',
      value: formatCurrency(totalPending, 'DKK', state.exchangeRates, displayCurrency),
      icon: Clock,
      trend: 'neutral'
    }
  ];

  // Essential entity counts
  const entityCounts = [
    { title: 'Customers', count: state.customers.length, color: 'text-blue-600' },
    { title: 'Sales', count: state.sales.length, color: 'text-green-600' },
    { title: 'Invoices', count: state.invoices.length, color: 'text-purple-600' },
    { title: 'Products', count: state.digitalCodes.length + state.tvBoxes.length, color: 'text-orange-600' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Business overview and key metrics</p>
        </div>
        {state.exchangeRates && (
          <div className="text-sm text-gray-500">
            Updated: {new Date(state.exchangeRates.lastUpdated).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Quick Actions - Compact */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className={`p-3 rounded-lg transition-colors text-left ${action.color}`}
              >
                <Icon className="h-5 w-5 mb-2" />
                <div>
                  <p className="font-medium text-sm">{action.title}</p>
                  <p className="text-xs opacity-75">{action.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Core Metrics - Compact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {coreMetrics.map((metric, index) => {
          const Icon = metric.icon;
          const trendColor =
            metric.trend === 'up' || metric.trend === 'positive' ? 'text-green-600' :
            metric.trend === 'down' || metric.trend === 'negative' ? 'text-red-600' :
            metric.trend === 'attention' ? 'text-yellow-600' :
            metric.trend === 'warning' ? 'text-orange-600' :
            metric.trend === 'neutral' ? 'text-blue-600' :
            'text-gray-600';
          
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-1">{metric.title}</p>
                  <p className="text-lg font-bold text-gray-900">{metric.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${
                  metric.trend === 'up' || metric.trend === 'positive' ? 'bg-green-100' :
                  metric.trend === 'down' || metric.trend === 'negative' ? 'bg-red-100' :
                  metric.trend === 'attention' ? 'bg-yellow-100' :
                  metric.trend === 'warning' ? 'bg-orange-100' :
                  metric.trend === 'neutral' ? 'bg-blue-100' :
                  'bg-gray-100'
                }`}>
                  <Icon className={`h-4 w-4 ${trendColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Entity Overview - Compact */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Business Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {entityCounts.map((entity, index) => (
            <div key={index} className="text-center">
              <p className="text-2xl font-bold text-gray-900">{entity.count}</p>
              <p className="text-sm text-gray-600">{entity.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Summary - Compact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Invoicing</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Invoiced</span>
              <span className="text-sm font-medium">{formatCurrency(totalInvoiced, 'DKK', state.exchangeRates, displayCurrency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Paid</span>
              <span className="text-sm font-medium text-green-600">{formatCurrency(totalPaid, 'DKK', state.exchangeRates, displayCurrency)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Recurring Revenue</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Monthly Subscriptions</span>
              <span className="text-sm font-medium">{formatCurrency(subscriptionRevenue, 'DKK', state.exchangeRates, displayCurrency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Active Subs</span>
              <span className="text-sm font-medium">{state.subscriptions?.filter(s => s.status === 'active').length || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Recent Activity</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">This Month Sales</span>
              <span className="text-sm font-medium">{state.sales?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">New Customers</span>
              <span className="text-sm font-medium">{state.customers?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profit Overview - Compact */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Profit Analysis</h2>
          <p className="text-sm text-gray-600 mb-4">Monthly revenue and expense breakdown</p>
        </div>
        <div className="px-4 pb-4">
          <ProfitOverview />
        </div>
      </div>
    </div>
  );
};

export default CleanDashboard;