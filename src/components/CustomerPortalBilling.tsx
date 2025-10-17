import React from 'react';

const CustomerPortalBilling: React.FC = () => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Billing History</h1>
      <p className="text-gray-600 mb-6">View your past invoices and upcoming payment schedule.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Bills */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Upcoming Bills (Placeholder)</h2>
          <ul className="space-y-3">
            <li className="flex justify-between items-center p-2 bg-yellow-50 rounded-md">
              <span className="font-medium">Invoice #UPC-001</span>
              <span>$25.00 - Due: 2025-11-01</span>
            </li>
            <li className="flex justify-between items-center p-2 bg-yellow-50 rounded-md">
              <span className="font-medium">Invoice #UPC-002</span>
              <span>$15.00 - Due: 2025-12-01</span>
            </li>
          </ul>
          <p className="text-sm text-gray-500 mt-4">Your future payment obligations will be listed here.</p>
        </div>

        {/* Past Bills */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Past Bills (Placeholder)</h2>
          <ul className="space-y-3">
            <li className="flex justify-between items-center p-2 bg-green-50 rounded-md">
              <span className="font-medium">Invoice #PAST-003</span>
              <span>$30.00 - Paid: 2025-09-20</span>
            </li>
            <li className="flex justify-between items-center p-2 bg-green-50 rounded-md">
              <span className="font-medium">Invoice #PAST-002</span>
              <span>$20.00 - Paid: 2025-08-15</span>
            </li>
            <li className="flex justify-between items-center p-2 bg-green-50 rounded-md">
              <span className="font-medium">Invoice #PAST-001</span>
              <span>$10.00 - Paid: 2025-07-10</span>
            </li>
          </ul>
          <p className="text-sm text-gray-500 mt-4">A detailed history of your paid and cancelled bills.</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortalBilling;