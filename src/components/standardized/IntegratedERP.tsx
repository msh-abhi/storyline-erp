import React, { useState } from 'react';
import { useAuth } from '../AuthProvider';
import { ActiveSection } from '../../types';
import StandardizedLayout from './ERPAppLayout';
import StandardizedERP from './StandardizedERP';

const IntegratedERP: React.FC = () => {
  const { } = useAuth();
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');

  // Handle section changes
  const handleSectionChange = (section: string) => {
    setActiveSection(section as ActiveSection);
  };

  // Render the integrated ERP system
  return (
    <div className="min-h-screen bg-gray-50">
      <StandardizedLayout
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      >
        <StandardizedERP
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
      </StandardizedLayout>
    </div>
  );
};

export default IntegratedERP;