export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'suspended';
  whatsappNumber?: string;
  macAddress?: string;
  customFields: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

// Define PaymentTransaction as it's used in Reseller and Supplier
export interface PaymentTransaction {
  id: string;
  entityId: string; // ID of the reseller/supplier
  entityType: 'reseller' | 'supplier';
  amount: number;
  type: 'credit_add' | 'credit_use' | 'sale'; // Example types
  description?: string;
  paymentMethod?: string;
  transactionDate: string;
  createdAt?: string;
}

export interface Reseller {
  id: string;
  name: string;
  email: string;
  creditBalance: number;
  paymentHistory: PaymentTransaction[]; // Assuming this is an array of transactions
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  creditBalance: number;
  paymentHistory: PaymentTransaction[]; // Assuming this is an array of transactions
  createdAt?: string;
  updatedAt?: string;
}

export interface DigitalCode {
  id: string;
  code: string;
  value: string;
  quantity: number; // FIX: Added quantity
  soldQuantity: number;
  status: string;
  customerPrice: number; // FIX: Added customerPrice
  resellerPrice: number; // FIX: Added resellerPrice
  purchasePrice: number; // FIX: Added purchasePrice
  name: string; // FIX: Added name for display
  createdAt: string;
  updatedAt: string;
}

export interface TVBox {
  id: string;
  serialNumber: string;
  model: string;
  quantity: number; // FIX: Added quantity
  soldQuantity: number;
  status: string;
  customerPrice: number; // FIX: Added customerPrice
  resellerPrice: number; // FIX: Added resellerPrice
  purchasePrice: number; // FIX: Added purchasePrice
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string; // FIX: Added
  productType: 'digital_code' | 'tv_box' | 'subscription'; // FIX: Added
  buyerId: string; // FIX: Added
  buyerName: string; // FIX: Added
  buyerType: 'customer' | 'reseller'; // FIX: Added
  customerId: string | null; // FIX: Changed to allow null
  quantity: number;
  unitPrice: number; // FIX: Added
  totalPrice: number;
  profit: number; // FIX: Added
  paymentStatus: 'received' | 'due' | 'partial'; // FIX: Added
  status: 'completed' | 'pending' | 'cancelled'; // FIX: Added
  saleDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  supplierId: string;
  productId: string; // Or digitalCodeId/tvBoxId
  quantity: number;
  totalCost: number;
  purchaseDate: string; // Ensure this is present
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  customerName: string; // FIX: Added customerName
  productId: string; // FIX: Added
  productName: string; // FIX: Added
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  startDate: string;
  endDate: string;
  price: number;
  durationMonths: number; // FIX: Added
  reminder7Sent: boolean; // FIX: Added
  reminder3Sent: boolean; // FIX: Added
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMonths: number; // FIX: Changed from 'duration' to 'durationMonths'
  isActive: boolean; // FIX: Added isActive
  createdAt: string;
  updatedAt: string;
}

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'DKK'; // Example currencies
export type SupportedLanguage = 'en' | 'da'; // FIX: Define supported languages

export interface Invoice {
  id: string;
  customerId: string;
  amount: number;
  status: 'paid' | 'pending' | 'cancelled';
  subscriptionId?: string; // Added, made optional
  currency: SupportedCurrency; // Added
  createdAt?: string;
  updatedAt?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  method: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailSettings {
  senderName: string;
  senderEmail: string;
  // ... other email settings
}

export interface Settings {
  id: string;
  currency: SupportedCurrency;
  language: SupportedLanguage; // FIX: Use SupportedLanguage type
  companyName: string;
  emailSettings: any;
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeRates {
  id: string;
  baseCurrency: SupportedCurrency;
  rates: Record<SupportedCurrency, number>;
  updatedAt?: string;
}

export interface CustomerPortalUser {
  id: string;
  auth_id: string; // We keep this name in the app, but map it from 'auth_provider_id' in the service
  customer_id: string | null;
  email: string;
  created_at?: string;
  last_login_at?: string;
}

export interface CustomerCredential {
  id: string;
  customer_id: string;
  server_id: string;
  password?: string;
  server_url: string;
  notes?: string;
  mac_address?: string;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
}

export interface CustomerMessage {
  id: string;
  customer_id: string | null;
  subject: string;
  category: string;
  message: string;
  status: string;
  created_at?: string;
  admin_notes?: string;
}

// This new type represents a row in your public.users table
export interface UserProfile {
  id: string;
  auth_id: string; // FIX: Added
  customer_id: string | null; // FIX: Added
  email: string;
  created_at?: string;
  last_login_at?: string;
  name?: string;
  is_admin: boolean;
}

export type ActiveSection =
  | 'dashboard'
  | 'customers'
  | 'subscriptions'
  | 'resellers'
  | 'suppliers'
  | 'digital-codes'
  | 'tv-boxes'
  | 'sales'
  | 'purchases'
  | 'invoices'
  | 'emails'
  | 'email-logs'
  | 'email-templates'
  | 'woocommerce-orders'
  | 'settings';

// ... rest of your types
