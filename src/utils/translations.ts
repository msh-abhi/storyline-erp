export const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    customers: 'Customers',
    resellers: 'Resellers',
    suppliers: 'Suppliers',
    digitalCodes: 'Digital Codes',
    tvBoxes: 'TV Boxes',
    sales: 'Sales',
    purchases: 'Purchases',
    emails: 'Email Templates',
    subscriptions: 'Subscriptions',
    settings: 'Settings',
    
    // Common
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
    name: 'Name',
    email: 'Email',
    price: 'Price',
    quantity: 'Quantity',
    status: 'Status',
    date: 'Date',
    actions: 'Actions',
    total: 'Total',
    
    // Dashboard
    totalRevenue: 'Total Revenue',
    netProfit: 'Net Profit',
    outstandingReceivables: 'Outstanding Receivables',
    outstandingPayables: 'Outstanding Payables',
    inventoryValue: 'Inventory Value',
    totalProfitFromSales: 'Total Profit from Sales',
    
    // Currency
    currency: 'DKK',
    
    // Subscription reminders
    subscriptionReminder: 'Subscription Reminder',
    renewalReminder: 'Your subscription expires soon',
    
    // Settings
    companyName: 'Company Name',
    language: 'Language',
    emailSettings: 'Email Settings'
  },
  da: {
    // Navigation
    dashboard: 'Dashboard',
    customers: 'Kunder',
    resellers: 'Forhandlere',
    suppliers: 'Leverandører',
    digitalCodes: 'Digitale Koder',
    tvBoxes: 'TV Bokse',
    sales: 'Salg',
    purchases: 'Indkøb',
    emails: 'Email Skabeloner',
    subscriptions: 'Abonnementer',
    settings: 'Indstillinger',
    
    // Common
    add: 'Tilføj',
    edit: 'Rediger',
    delete: 'Slet',
    save: 'Gem',
    cancel: 'Annuller',
    search: 'Søg',
    name: 'Navn',
    email: 'Email',
    price: 'Pris',
    quantity: 'Antal',
    status: 'Status',
    date: 'Dato',
    actions: 'Handlinger',
    total: 'Total',
    
    // Dashboard
    totalRevenue: 'Samlet Omsætning',
    netProfit: 'Nettofortjeneste',
    outstandingReceivables: 'Udestående Tilgodehavender',
    outstandingPayables: 'Udestående Gæld',
    inventoryValue: 'Lagerværdi',
    totalProfitFromSales: 'Samlet Fortjeneste fra Salg',
    
    // Currency
    currency: 'DKK',
    
    // Subscription reminders
    subscriptionReminder: 'Abonnement Påmindelse',
    renewalReminder: 'Dit abonnement udløber snart',
    
    // Settings
    companyName: 'Firmanavn',
    language: 'Sprog',
    emailSettings: 'Email Indstillinger'
  }
};

export type TranslationKey = keyof typeof translations.en;

export function getTranslation(key: TranslationKey, language: 'en' | 'da' = 'en'): string {
  return translations[language][key] || translations.en[key] || key;
}