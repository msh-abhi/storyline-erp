import { readFileSync, writeFileSync } from 'fs';

const dashboardPath = 'src/components/CustomerPortalDashboard.tsx';
let content = readFileSync(dashboardPath, 'utf8');

// 1. Make welcome header responsive
content = content.replace(
    /<h1 className="text-4xl font-bold mb-3 text-white">/g,
    '<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 md:mb-3 text-white">'
);

content = content.replace(
    /<p className="text-blue-100 text-lg">/g,
    '<p className="text-blue-100 text-sm md:text-base lg:text-lg">'
);

// 2. Make welcome header layout responsive (stack on mobile)
content = content.replace(
    /<div className="flex justify-between items-start">/g,
    '<div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-4">'
);

// 3. Hide account status card on mobile in welcome header
content = content.replace(
    /<div className="text-right">\s*<div className="bg-white\/10 backdrop-blur-sm rounded-lg p-4 border border-white\/20">/g,
    '<div className="hidden md:block text-right">\n            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">'
);

// 4. Make stats grid responsive and reduce padding
content = content.replace(
    /<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">/g,
    '<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">'
);

// 5. Hide Total Spent card on mobile (3rd card)
content = content.replace(
    /{\/\* Total Spent Card \*\/}\s*<div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-green-200">/g,
    '{/* Total Spent Card - Hidden on mobile */}\n        <div className="hidden sm:block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-green-200">'
);

// 6. Hide Support Tickets card on mobile (4th card)
content = content.replace(
    /{\/\* Support Tickets Card \*\/}\s*<div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-purple-200">/g,
    '{/* Support Tickets Card - Hidden on mobile */}\n        <div className="hidden sm:block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-purple-200">'
);

// 7. Make main content grid responsive
content = content.replace(
    /<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">/g,
    '<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">'
);

// 8. Reduce padding on cards for mobile
content = content.replace(
    /rounded-xl p-8 text-white shadow-lg/g,
    'rounded-xl p-4 md:p-6 lg:p-8 text-white shadow-lg'
);

writeFileSync(dashboardPath, content, 'utf8');
console.log('✓ Dashboard optimized for mobile');
console.log('  - Responsive text sizes');
console.log('  - Stacked layout on mobile');
console.log('  - Hidden less critical cards on mobile');
console.log('  - Reduced padding for mobile');
