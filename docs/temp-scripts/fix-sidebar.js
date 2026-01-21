import { readFileSync, writeFileSync } from 'fs';

const layoutPath = 'src/components/CustomerPortalLayout.tsx';
let content = readFileSync(layoutPath, 'utf8');

// Fix 2: Make sidebar fixed position
content = content.replace(
    /<aside className="bg-white shadow-xl border-r border-gray-200 flex flex-col h-full transition-all duration-300 w-80">/g,
    '<aside className="fixed left-0 top-0 h-screen bg-white shadow-xl border-r border-gray-200 flex flex-col transition-all duration-300 w-80 z-40">'
);

// Fix 3: Add margin-left to main content to offset fixed sidebar
content = content.replace(
    /{\/\* Main Content \*\/}\s+<div className="flex-1 flex flex-col">/g,
    '{/* Main Content - Offset for fixed sidebar */}\n      <div className="flex-1 flex flex-col ml-80">'
);

writeFileSync(layoutPath, content, 'utf8');
console.log('✓ Fixed sidebar positioning');
console.log('✓ Added margin to main content');
