import { readFileSync, writeFileSync } from 'fs';

// Fix Billing Page
const billingPath = 'src/components/CustomerPortalBilling.tsx';
let billingContent = readFileSync(billingPath, 'utf8');

// Make payment buttons stack vertically on mobile
billingContent = billingContent.replace(
    /<div className="flex flex-col sm:flex-row gap-2">/g,
    '<div className="flex flex-col gap-2">'
);

// Make buttons full width on mobile
billingContent = billingContent.replace(
    /className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-all disabled:bg-gray-400 flex items-center gap-2"/g,
    'className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-all disabled:bg-gray-400 flex items-center justify-center gap-2"'
);

billingContent = billingContent.replace(
    /className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-all disabled:bg-gray-400 flex items-center gap-2"/g,
    'className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-all disabled:bg-gray-400 flex items-center justify-center gap-2"'
);

// Make invoice list items stack better on mobile
billingContent = billingContent.replace(
    /className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-yellow-50 rounded-md"/g,
    'className="flex flex-col justify-between items-start p-3 md:p-4 bg-yellow-50 rounded-md gap-3"'
);

// Responsive padding for main container
billingContent = billingContent.replace(
    /className="p-6 bg-white rounded-lg shadow-md"/g,
    'className="p-4 md:p-6 bg-white rounded-lg shadow-md"'
);

// Responsive text sizes
billingContent = billingContent.replace(
    /className="text-3xl font-bold text-gray-800 mb-4"/g,
    'className="text-2xl md:text-3xl font-bold text-gray-800 mb-4"'
);

writeFileSync(billingPath, billingContent, 'utf8');
console.log('✓ Billing page optimized for mobile');

// Fix Subscriptions Page
const subscriptionsPath = 'src/components/CustomerPortalSubscriptions.tsx';
let subsContent = readFileSync(subscriptionsPath, 'utf8');

// Make subscription cards stack better
subsContent = subsContent.replace(
    /className="p-6 bg-white rounded-lg shadow-md"/g,
    'className="p-4 md:p-6 bg-white rounded-lg shadow-md"'
);

// Responsive text sizes
subsContent = subsContent.replace(
    /className="text-3xl font-bold text-gray-800 mb-4"/g,
    'className="text-2xl md:text-3xl font-bold text-gray-800 mb-4"'
);

subsContent = subsContent.replace(
    /className="text-xl font-semibold text-gray-700 mb-3"/g,
    'className="text-lg md:text-xl font-semibold text-gray-700 mb-3"'
);

writeFileSync(subscriptionsPath, subsContent, 'utf8');
console.log('✓ Subscriptions page optimized for mobile');

console.log('\n✅ All Customer Portal pages optimized for mobile!');
