import React from 'react';
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  Tv,
  Mail,
  Code,
  ShoppingCart,
  CreditCard,
  Calendar,
  Settings,
  ChevronDown,
  ChevronRight,
  FileText
} from 'lucide-react';
import { ActiveSection } from '../types';
import { useApp } from '../context/AppContext'; // FIX: Changed useApp to useApp

interface SidebarProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
}

interface MenuItem {
  id: ActiveSection;
  label: string;
  icon: React.ComponentType<any>;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'customers',
    label: 'Customer Management',
    icon: Users,
    children: [
      { id: 'customers', label: 'Customers', icon: Users },
      { id: 'subscriptions', label: 'Subscriptions', icon: Calendar }
    ]
  },
  {
    id: 'resellers',
    label: 'Partner Management',
    icon: Store,
    children: [
      { id: 'resellers', label: 'Resellers', icon: Store },
      { id: 'suppliers', label: 'Suppliers', icon: Package }
    ]
  },
  {
    id: 'digital-codes',
    label: 'Inventory',
    icon: Package,
    children: [
      { id: 'digital-codes', label: 'Digital Codes', icon: Code },
      { id: 'tv-boxes', label: 'TV Boxes', icon: Tv }
    ]
  },
  {
    id: 'sales',
    label: 'Transactions',
    icon: ShoppingCart,
    children: [
      { id: 'sales', label: 'Sales', icon: ShoppingCart },
      { id: 'purchases', label: 'Purchases', icon: CreditCard },
      { id: 'invoices', label: 'Invoices', icon: FileText }
    ]
  },
  {
    id: 'emails', // Parent ID
    label: 'Email Management',
    icon: Mail,
    children: [
      { id: 'email-templates', label: 'Email Templates', icon: Mail }, // FIX: Changed to 'email-templates'
      { id: 'email-logs', label: 'Email Logs', icon: Mail }
    ]
  },
  { id: 'woocommerce-orders', label: 'WooCommerce Orders', icon: ShoppingCart },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const { state } = useApp();
  const [expandedMenus, setExpandedMenus] = React.useState<Set<string>>(new Set());

  const toggleMenu = (menuId: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId);
    } else {
      newExpanded.add(menuId);
    }
    setExpandedMenus(newExpanded);
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.has(item.id);
    const isActive = activeSection === item.id;
    const isChildActive = item.children?.some(child => child.id === activeSection);

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleMenu(item.id);
            } else {
              onSectionChange(item.id);
            }
          }}
          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-200 rounded-lg mx-2 ${
            level === 0 ? 'text-sm font-medium' : 'text-sm ml-4'
          } ${
            isActive || isChildActive
              ? 'bg-blue-50/80 text-blue-700 border-r-2 border-blue-600 shadow-sm backdrop-blur-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80 backdrop-blur-sm'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Icon className={`h-5 w-5 ${isActive || isChildActive ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>{item.label}</span>
          </div>
          {hasChildren && (
            isExpanded ?
              <ChevronDown className="h-4 w-4 text-slate-400" /> :
              <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-white/80 backdrop-blur-md shadow-lg border-r border-slate-200/60 h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-blue-50/50 to-slate-50/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
            <LayoutDashboard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {state.settings?.companyName || 'Jysk Streaming'}
            </h1>
            <p className="text-xs text-slate-500">Business Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-slate-200/60 bg-slate-50/30">
        <button
          onClick={() => onSectionChange('settings')}
          className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50/80 rounded-lg transition-all duration-200 backdrop-blur-sm"
        >
          <Settings className="h-5 w-5 text-slate-400" />
          <span>Account & Settings</span>
        </button>
      </div>
    </div>
  );
}