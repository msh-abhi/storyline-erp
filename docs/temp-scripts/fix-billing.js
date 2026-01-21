import { readFileSync, writeFileSync } from 'fs';

const billingPath = 'src/components/CustomerPortalBilling.tsx';
let content = readFileSync(billingPath, 'utf8');

// Fix 4: Change "Paid:" label to "Date:" for all invoices
content = content.replace(
    /{formatCurrency\(invoice\.amount, invoice\.currency, null\)} - Paid: {new Date/g,
    '{formatCurrency(invoice.amount, invoice.currency, null)} - Date: {new Date'
);

writeFileSync(billingPath, content, 'utf8');
console.log('✓ Fixed invoice status label from "Paid:" to "Date:"');
