import React from 'react';
import { useApp } from '../../context/AppContext';
import { ActiveSection } from '../../types';

// Import existing components
import SupplierManagement from '../SupplierManagement';
import DigitalCodeManagement from '../DigitalCodeManagement';
import TVBoxManagement from '../TVBoxManagement';
import SalesManagement from '../SalesManagement';
import PurchaseManagement from '../PurchaseManagement';
import SubscriptionManagement from '../SubscriptionManagement';
import EmailTemplateManagement from '../EmailTemplateManagement';
import EmailLogs from '../EmailLogs';
import InvoiceManagement from '../InvoiceManagement';
import WooCommerceOrders from '../WooCommerceOrders';
import Settings from '../Settings';
import Dashboard from '../Dashboard';
import ProfitOverview from '../ProfitOverview';

// Import new standardized modules
import UnifiedCustomerManagement from './modules/UnifiedCustomerManagement';
import UnifiedSalesModule from './modules/UnifiedSalesModule';

interface StandardizedERPProps {
  activeSection: ActiveSection;
  onSectionChange: (section: ActiveSection) => void;
}

const StandardizedERP: React.FC<StandardizedERPProps> = ({ 
  activeSection, 
  onSectionChange 
}) => {
  // Route handler for different sections
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard onSectionChange={onSectionChange} />;
      
      case 'analytics':
        return <ProfitOverview />;
      
      case 'customers':
        return <UnifiedCustomerManagement activeView="customers" />;
      
      case 'resellers':
        return <UnifiedCustomerManagement activeView="resellers" />;
      
      case 'digital-codes':
        return <DigitalCodeManagement />;
      
      case 'tv-boxes':
        return <TVBoxManagement />;
      
      case 'sales':
        return <UnifiedSalesModule />;
      
      case 'subscription-products':
        return <SubscriptionManagement />;
      
      case 'subscriptions':
        return <SubscriptionManagement />;
      
      case 'purchases':
        return <PurchaseManagement />;
      
      case 'invoices':
        return <InvoiceManagement />;
      
      case 'email-templates':
        return <EmailTemplateManagement />;
      
      case 'email-logs':
        return <EmailLogs />;
      
      case 'woocommerce-orders':
        return <WooCommerceOrders />;
      
      case 'suppliers':
        return <SupplierManagement />;
      
      case 'settings':
        return <Settings />;
      
      default:
        return <Dashboard onSectionChange={onSectionChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderActiveSection()}
    </div>
  );
};

export default StandardizedERP;