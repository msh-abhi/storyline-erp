import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/components/CustomerPortalDashboard.tsx';
let content = readFileSync(filePath, 'utf8');

// Fix 1: Add text-white to welcome message h1
content = content.replace(
    /<h1 className="text-4xl font-bold mb-3">/g,
    '<h1 className="text-4xl font-bold mb-3 text-white">'
);

writeFileSync(filePath, content, 'utf8');
console.log('✓ Fixed welcome message text color');
