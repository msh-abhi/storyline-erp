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
  Settings
} from 'lucide-react';
import { ActiveSection } from '../types';
import LanguageSelector from './LanguageSelector';
import { useApp } from '../context/AppContext';

interface NavigationProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
}

const navigationItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'customers' as const, label: 'Customers', icon: Users },
  { id: 'resellers' as const, label: 'Resellers', icon: Store },
  { id: 'suppliers' as const, label: 'Suppliers', icon: Package },
  { id: 'digital-codes' as const, label: 'Digital Codes', icon: Code },
  { id: 'tv-boxes' as const, label: 'TV Boxes', icon: Tv },
  { id: 'sales' as const, label: 'Sales', icon: ShoppingCart },
  { id: 'purchases' as const, label: 'Purchases', icon: CreditCard },
  { id: 'subscriptions' as const, label: 'Subscriptions', icon: Calendar },
  { id: 'emails' as const, label: 'Email Templates', icon: Mail },
  { id: 'settings' as const, label: 'Settings', icon: Settings }
];

export default function Navigation({ activeSection, onSectionChange }: NavigationProps) {
  const { state, actions } = useApp();
  
  const handleLanguageChange = async (language: 'en' | 'da') => {
    if (state.settings) {
      await actions.updateSettings(state.settings.id, { language });
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <LayoutDashboard className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">
              {state.settings?.companyName || 'Jysk Streaming'}
            </h1>
          </div>
          
          <div className="hidden lg:block">
            <div className="ml-10 flex items-baseline space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={`px-2 py-2 rounded-md text-xs font-medium flex items-center space-x-1 transition-colors ${
                      activeSection === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <LanguageSelector 
              currentLanguage={state.settings?.language || 'en'}
              onLanguageChange={handleLanguageChange}
            />
            
            <div className="lg:hidden">
              <select
                value={activeSection}
                onChange={(e) => onSectionChange(e.target.value as ActiveSection)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {navigationItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}