import React, { useState } from 'react';
import {
  Home, Users, ShoppingCart, Package, DollarSign,
  FileText, Settings, TrendingUp, Target,
  Bell, Mail, Globe, ChevronRight, ChevronDown,
  Zap, Shield, Building2, ShoppingBag, LogOut, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActiveSection } from '../../types';
import { useAuth } from '../../components/AuthProvider';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/calculations';

interface NavigationItem {
  id: ActiveSection;
  label: string;
  icon: React.ComponentType<any>;
  group: string;
  description?: string;
  badge?: string | number;
  directClick?: boolean;
}

interface NavigationGroup {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  items: NavigationItem[];
}

interface EnhancedNavigationProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
  collapsed?: boolean;
}

const EnhancedNavigation: React.FC<EnhancedNavigationProps> = ({
  activeSection,
  onSectionChange,
  collapsed = false
}) => {
  const { authUser, signOut } = useAuth();
  const { state } = useApp();
  const navigate = useNavigate();
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['dashboard', 'customers', 'revenue', 'inventory', 'financial'])
  );

  // Calculate real quick stats
  const today = new Date().toISOString().split('T')[0];
  const todaysSales = (state.sales || []).filter(sale => {
    const saleDate = new Date(sale.saleDate).toISOString().split('T')[0];
    return saleDate === today;
  });
  const todaysRevenue = todaysSales.reduce((sum, sale) => sum + (sale.totalPrice || 0), 0);
  const activeCustomers = (state.customers || []).filter(customer => customer.status === 'active').length;
  const displayCurrency = state.settings?.currency || 'DKK';

  const navigationGroups: NavigationGroup[] = [
    {
      id: 'dashboard',
      title: 'Dashboard & Analytics',
      description: 'Overview and business insights',
      icon: Home,
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: Home,
          group: 'dashboard',
          description: 'Business overview and KPIs',
          directClick: true
        }
      ]
    },
    {
      id: 'customers',
      title: 'Customer Management',
      description: 'Manage clients and relationships',
      icon: Users,
      items: [
        {
          id: 'customers',
          label: 'Customer Database',
          icon: Users,
          group: 'customers',
          description: 'Customer records and profiles',
          badge: 'core'
        },
        {
          id: 'resellers',
          label: 'Reseller Network',
          icon: Building2,
          group: 'customers',
          description: 'Reseller partnerships'
        }
      ]
    },
    {
      id: 'revenue',
      title: 'Revenue & Sales',
      description: 'Sales and revenue management',
      icon: ShoppingCart,
      items: [
        {
          id: 'sales',
          label: 'Sales Transactions',
          icon: ShoppingCart,
          group: 'revenue',
          description: 'All sales and revenue',
          badge: 'core'
        },
        {
          id: 'subscriptions',
          label: 'Subscription Management',
          icon: Zap,
          group: 'revenue',
          description: 'Customer subscriptions',
          badge: 'core'
        },
        {
          id: 'subscription-products',
          label: 'Subscription Products',
          icon: Target,
          group: 'revenue',
          description: 'Product catalog'
        }
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory & Purchases',
      description: 'Products and stock management',
      icon: Package,
      items: [
        {
          id: 'digital-codes',
          label: 'Digital Products',
          icon: Package,
          group: 'inventory',
          description: 'Digital codes and licenses'
        },
        {
          id: 'tv-boxes',
          label: 'Physical Inventory',
          icon: Package,
          group: 'inventory',
          description: 'TV boxes and hardware'
        },
        {
          id: 'purchases',
          label: 'Purchase Orders',
          icon: ShoppingBag,
          group: 'inventory',
          description: 'Inventory and expense purchases'
        },
        {
          id: 'suppliers',
          label: 'Supplier Management',
          icon: Building2,
          group: 'inventory',
          description: 'Vendor relationships'
        }
      ]
    },
    {
      id: 'financial',
      title: 'Financial Management',
      description: 'Invoicing and payments',
      icon: DollarSign,
      items: [
        {
          id: 'invoices',
          label: 'Invoice Management',
          icon: FileText,
          group: 'financial',
          description: 'Generate and track invoices',
          badge: 'core'
        }
      ]
    },
    {
      id: 'communication',
      title: 'Communication & Marketing',
      description: 'Customer engagement tools',
      icon: Mail,
      items: [
        {
          id: 'email-templates',
          label: 'Email Templates',
          icon: Mail,
          group: 'communication',
          description: 'Template management'
        },
        {
          id: 'email-logs',
          label: 'Email Tracking',
          icon: Bell,
          group: 'communication',
          description: 'Email delivery monitoring'
        }
      ]
    },
    {
      id: 'integrations',
      title: 'Integrations & Settings',
      description: 'System configuration',
      icon: Globe,
      items: [
        {
          id: 'woocommerce-orders',
          label: 'WooCommerce Integration',
          icon: Globe,
          group: 'integrations',
          description: 'E-commerce synchronization'
        },
        {
          id: 'integrations',
          label: 'Payment Settings',
          icon: Settings,
          group: 'integrations',
          description: 'MobilePay & Revolut setup',
          badge: 'core'
        },
        {
          id: 'settings',
          label: 'System Settings',
          icon: Settings,
          group: 'integrations',
          description: 'Global configuration'
        }
      ]
    }
  ];

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const isActiveItem = (item: NavigationItem) => activeSection === item.id;

  const handleItemClick = (item: NavigationItem) => {
    onSectionChange(item.id);
  };

  const handleLogout = async () => {
    try {
      console.log('EnhancedNavigation: Starting logout process...');
      await signOut();
      console.log('EnhancedNavigation: Sign out successful, redirecting...');
      // Navigate to login page (which will be rendered by the router based on auth state)
      navigate('/', { replace: true });
    } catch (error) {
      console.error('EnhancedNavigation: Logout failed:', error);
    }
  };

  return (
    <div className={`bg-white shadow-xl border-r border-gray-200 flex flex-col h-full transition-all duration-300 ${collapsed ? 'w-16' : 'w-80'}`}>
      {/* Logo Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-gray-900">Jysk ERP</h1>
              <p className="text-sm text-gray-500">Business Management</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-2 px-3">
          {navigationGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              {/* Group Header */}
              {!collapsed && (
                <div>
                  {/* Special handling for dashboard group */}
                  {group.id === 'dashboard' ? (
                    <button
                      onClick={() => handleItemClick(group.items[0])}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 group ${
                        isActiveItem(group.items[0])
                          ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 shadow-sm'
                          : 'hover:bg-gray-50 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg transition-colors ${
                          isActiveItem(group.items[0])
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                        }`}>
                          <group.icon className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-sm font-medium text-gray-900">{group.title}</h3>
                          <p className="text-xs text-gray-500">{group.description}</p>
                        </div>
                      </div>
                      {isActiveItem(group.items[0]) && (
                        <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                      )}
                    </button>
                  ) : (
                    /* Normal group header with toggle */
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                          <group.icon className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-sm font-medium text-gray-900">{group.title}</h3>
                          <p className="text-xs text-gray-500">{group.description}</p>
                        </div>
                      </div>
                      {expandedGroups.has(group.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Group Items */}
              {(!collapsed && expandedGroups.has(group.id) && group.id !== 'dashboard') || (collapsed && group.id !== 'dashboard') ? (
                <div className="space-y-1 ml-6">
                  {group.items.filter(item => item.id !== 'dashboard').map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all duration-200 group relative ${
                        isActiveItem(item)
                          ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 shadow-sm'
                          : 'hover:bg-gray-50 hover:shadow-sm'
                      }`}
                    >
                      {/* Nested Indicator Line */}
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-300 to-gray-400 rounded-full opacity-60" />
                      
                      {!collapsed && (
                        <div className="flex items-center space-x-3 pl-2">
                          {/* Sub-menu indicator */}
                          <ChevronLeft className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm font-medium truncate ${
                                isActiveItem(item) ? 'text-blue-900' : 'text-gray-700'
                              }`}>
                                {item.label}
                              </span>
                              {item.badge && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  item.badge === 'core'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className={`text-xs truncate ${
                              isActiveItem(item) ? 'text-blue-600' : 'text-gray-500'
                            }`}>
                              {item.description}
                            </p>
                          </div>
                        </div>
                      )}
                      {!collapsed && isActiveItem(item) && (
                        <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        {/* Quick Stats Footer */}
        {!collapsed && (
          <div className="mt-8 mx-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="text-sm font-medium text-gray-900">Quick Stats</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{formatCurrency(todaysRevenue, 'DKK', state.exchangeRates, displayCurrency)}</div>
                <div className="text-xs text-gray-500">Today's Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{activeCustomers}</div>
                <div className="text-xs text-gray-500">Active Customers</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {authUser?.email?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">Admin</div>
              <div className="text-xs text-gray-500 truncate">
                {authUser?.email || 'Loading...'}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedNavigation;