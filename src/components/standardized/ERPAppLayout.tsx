import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Package, 
  CreditCard, 
  FileText, 
  Settings, 
  Store,
  
  MessageSquare,
  Bell,
  Search,
  User,
  LogOut,
  Menu,
  X,
  Building2,
  UserCheck,
  Archive,
  BarChart3,
  Zap
} from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { useApp } from '../../context/AppContext';

interface StandardizedLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const StandardizedLayout: React.FC<StandardizedLayoutProps> = ({ 
  children, 
  activeSection, 
  onSectionChange 
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const { state } = useApp();

  // Standardized ERP Navigation Structure
  const navigationGroups = [
    {
      title: 'OVERVIEW',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          description: 'Business Overview',
          color: 'text-blue-600'
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          description: 'Performance Reports',
          color: 'text-purple-600'
        }
      ]
    },
    {
      title: 'CUSTOMER MANAGEMENT',
      items: [
        {
          id: 'customers',
          label: 'Customers',
          icon: Users,
          description: 'Customer Database',
          color: 'text-green-600',
          badge: state.customers.length
        },
        {
          id: 'resellers',
          label: 'Resellers',
          icon: Store,
          description: 'Reseller Network',
          color: 'text-emerald-600',
          badge: state.resellers.length
        }
      ]
    },
    {
      title: 'INVENTORY & SALES',
      items: [
        {
          id: 'digital-codes',
          label: 'Digital Products',
          icon: Zap,
          description: 'IPTV & Digital Codes',
          color: 'text-blue-500',
          badge: state.digitalCodes.length
        },
        {
          id: 'tv-boxes',
          label: 'TV Boxes',
          icon: Package,
          description: 'Hardware Inventory',
          color: 'text-gray-600',
          badge: state.tvBoxes.length
        },
        {
          id: 'sales',
          label: 'Sales',
          icon: ShoppingCart,
          description: 'Sales Transactions',
          color: 'text-orange-600',
          badge: state.sales.length
        }
      ]
    },
    {
      title: 'SUBSCRIPTION MANAGEMENT',
      items: [
        {
          id: 'subscription-products',
          label: 'Products',
          icon: Archive,
          description: 'Subscription Plans',
          color: 'text-indigo-600',
          badge: state.subscriptionProducts?.length || 0
        },
        {
          id: 'subscriptions',
          label: 'Active Subscriptions',
          icon: UserCheck,
          description: 'Customer Subscriptions',
          color: 'text-teal-600',
          badge: state.subscriptions?.filter(s => s.status === 'active').length || 0
        }
      ]
    },
    {
      title: 'FINANCIAL MANAGEMENT',
      items: [
        {
          id: 'purchases',
          label: 'Purchases',
          icon: CreditCard,
          description: 'Supplier Payments',
          color: 'text-red-600',
          badge: state.purchases.length
        },
        {
          id: 'invoices',
          label: 'Invoices',
          icon: FileText,
          description: 'Billing & Invoicing',
          color: 'text-cyan-600',
          badge: state.invoices.length
        }
      ]
    },
    {
      title: 'COMMUNICATION',
      items: [
        {
          id: 'email-templates',
          label: 'Email Templates',
          icon: MessageSquare,
          description: 'Communication Templates',
          color: 'text-pink-600',
          badge: state.emailTemplates.length
        },
        {
          id: 'email-logs',
          label: 'Email Logs',
          icon: Archive,
          description: 'Message History',
          color: 'text-violet-600'
        }
      ]
    },
    {
      title: 'INTEGRATIONS',
      items: [
        {
          id: 'woocommerce-orders',
          label: 'WooCommerce',
          icon: Building2,
          description: 'Online Store Orders',
          color: 'text-purple-500'
        }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        {
          id: 'suppliers',
          label: 'Suppliers',
          icon: Building2,
          description: 'Supplier Management',
          color: 'text-amber-600',
          badge: state.suppliers.length
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: Settings,
          description: 'System Configuration',
          color: 'text-gray-500'
        }
      ]
    }
  ];

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Standardized Sidebar */}
      <div className={`bg-white shadow-lg border-r border-gray-200 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-80'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-gray-900">StoryLine ERP</h1>
                <p className="text-sm text-gray-600">Business Management System</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          {navigationGroups.map((group) => (
            <div key={group.title} className="mb-6">
              {!sidebarCollapsed && (
                <div className="px-4 mb-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {group.title}
                  </h3>
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSectionChange(item.id)}
                      className={`w-full flex items-center px-4 py-3 text-left transition-all duration-200 group relative ${
                        isActive
                          ? 'bg-blue-50 border-r-2 border-blue-600 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      title={sidebarCollapsed ? item.label : ''}
                    >
                      <Icon 
                        size={20} 
                        className={`${isActive ? 'text-blue-600' : item.color} flex-shrink-0`} 
                      />
                      {!sidebarCollapsed && (
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{item.label}</span>
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full ${
                                isActive 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-gray-200 text-gray-700'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  Administrator
                </p>
                <p className="text-xs text-gray-500 truncate">
                  System Administrator
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
              >
                <Menu size={20} />
              </button>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 capitalize">
                  {activeSection.replace('-', ' ')}
                </h2>
                <p className="text-sm text-gray-600">
                  {navigationGroups
                    .flatMap(group => group.items)
                    .find(item => item.id === activeSection)?.description || 
                    'Manage your business operations'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Notifications */}
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
                <Bell size={20} className="text-gray-600" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">3</span>
                </span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                      Profile Settings
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center"
                    >
                      <LogOut size={16} className="mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StandardizedLayout;