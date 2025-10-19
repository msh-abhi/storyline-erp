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

export interface PaymentTransaction {
  id: string;
  invoiceId?: string; // Link to invoice
  customerId?: string; // Link to customer
  entityId?: string; // Optional: For reseller/supplier
  entityType?: 'reseller' | 'supplier'; // Optional
  amount: number;
  currency: SupportedCurrency;
  type?: 'credit_add' | 'credit_use' | 'sale' | 'payment';
  description?: string;
  paymentMethod: 'manual' | 'mobilepay' | 'revolut';
  transactionId?: string; // From payment provider
  transactionDate: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  providerResponse?: Record<string, any>; // To store raw response from provider
  createdAt?: string;
}

export interface Reseller {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  outstandingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email: string;
  phone?: string;
  address?: string;
  amountOwed: number;
  createdAt: string;
  updatedAt: string;
}

export interface DigitalCode {
  id: string;
  code: string;
  value: string;
  quantity: number;
  soldQuantity: number;
  status: string;
  customerPrice: number;
  resellerPrice: number;
  purchasePrice: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TVBox {
  id: string;
  serialNumber: string;
  model: string;
  quantity: number;
  soldQuantity: number;
  status: string;
  customerPrice: number;
  resellerPrice: number;
  purchasePrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  productType: 'digital_code' | 'tv_box' | 'subscription';
  buyerId: string;
  buyerName: string;
  buyerType: 'customer' | 'reseller';
  customerId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  profit: number;
  paymentStatus: 'received' | 'due' | 'partial';
  status: 'completed' | 'pending' | 'cancelled';
  saleDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  productId: string;
  productName: string;
  productType: 'digital_code' | 'tv_box';
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  purchaseDate: string;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: string;
  updatedAt: string;
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
  customerName: string;
  productId: string;
  productName: string;
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  startDate: string;
  endDate: string;
  price: number;
  durationMonths: number;
  reminder7Sent: boolean;
  reminder3Sent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMonths: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'DKK';
export type SupportedLanguage = 'en' | 'da';

export interface Invoice {
  id: string;
  customerId: string;
  amount: number;
  status: 'paid' | 'pending' | 'cancelled' | 'refunded';
  subscriptionId?: string;
  currency: SupportedCurrency;
  paymentMethod: 'manual' | 'mobilepay' | 'revolut';
  dueDate: string;
  issuedDate: string;
  metadata?: Record<string, any>;
  externalPaymentId?: string;
  paymentLink?: string;
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
}

export interface Settings {
  id: string;
  currency: SupportedCurrency;
  language: SupportedLanguage;
  companyName: string;
  emailSettings: any;
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeRates {
  rates: Record<SupportedCurrency, number>;
  lastUpdated: string;
  success: boolean;
}

export interface UserProfile {
  id: string;
  email?: string | null;
  isAdmin?: boolean;
}

export interface CustomerPortalUser {
  id: string;
  auth_id: string;
  customer_id: string | null;
  email: string;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}

export interface CustomerMessage {
  id: string;
  customer_id: string;
  subject: string;
  message: string;
  category: string;
  status: 'open' | 'closed' | 'pending';
  admin_notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerCredential {
  id: string;
  customer_id: string;
  server_url: string;
  server_id: string;
  username?: string | null;
  password?: string | null;
  mac_address?: string | null;
  expires_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
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

// --- App State and Actions ---
export interface AppState {
  loading: boolean;
  error: string | null;
  customers: Customer[];
  resellers: Reseller[];
  suppliers: Supplier[];
  digitalCodes: DigitalCode[];
  tvBoxes: TVBox[];
  sales: Sale[];
  purchases: Purchase[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  payments: Payment[];
  paymentTransactions: PaymentTransaction[];
  emailTemplates: EmailTemplate[];
  subscriptionProducts: SubscriptionProduct[];
  settings: Settings | null;
  exchangeRates: ExchangeRates | null;
}

export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INITIAL_DATA'; payload: Partial<AppState> }
  | { type: 'SET_EXCHANGE_RATES'; payload: ExchangeRates | null }
  | { type: 'SET_SETTINGS'; payload: Settings | null }
  | { type: 'RESET_STATE' } // Add this action
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'DELETE_CUSTOMER'; payload: string }
  | { type: 'ADD_RESELLER'; payload: Reseller }
  | { type: 'UPDATE_RESELLER'; payload: Reseller }
  | { type: 'DELETE_RESELLER'; payload: string }
  | { type: 'ADD_SUPPLIER'; payload: Supplier }
  | { type: 'UPDATE_SUPPLIER'; payload: Supplier }
  | { type: 'DELETE_SUPPLIER'; payload: string }
  | { type: 'ADD_DIGITAL_CODE'; payload: DigitalCode }
  | { type: 'UPDATE_DIGITAL_CODE'; payload: DigitalCode }
  | { type: 'DELETE_DIGITAL_CODE'; payload: string }
  | { type: 'ADD_TV_BOX'; payload: TVBox }
  | { type: 'UPDATE_TV_BOX'; payload: TVBox }
  | { type: 'DELETE_TV_BOX'; payload: string }
  | { type: 'ADD_SALE'; payload: Sale }
  | { type: 'UPDATE_SALE'; payload: Sale }
  | { type: 'DELETE_SALE'; payload: string }
  | { type: 'ADD_PURCHASE'; payload: Purchase }
  | { type: 'UPDATE_PURCHASE'; payload: Purchase }
  | { type: 'DELETE_PURCHASE'; payload: string }
  | { type: 'ADD_SUBSCRIPTION'; payload: Subscription }
  | { type: 'UPDATE_SUBSCRIPTION'; payload: Subscription }
  | { type: 'DELETE_SUBSCRIPTION'; payload: string }
  | { type: 'ADD_INVOICE'; payload: Invoice }
  | { type: 'UPDATE_INVOICE'; payload: Invoice }
  | { type: 'DELETE_INVOICE'; payload: string }
  | { type: 'ADD_PAYMENT'; payload: Payment }
  | { type: 'UPDATE_PAYMENT'; payload: Payment }
  | { type: 'DELETE_PAYMENT'; payload: string }
  | { type: 'ADD_PAYMENT_TRANSACTION'; payload: PaymentTransaction }
  | { type: 'UPDATE_PAYMENT_TRANSACTION'; payload: PaymentTransaction }
  | { type: 'DELETE_PAYMENT_TRANSACTION'; payload: string }
  | { type: 'ADD_EMAIL_TEMPLATE'; payload: EmailTemplate }
  | { type: 'UPDATE_EMAIL_TEMPLATE'; payload: EmailTemplate }
  | { type: 'DELETE_EMAIL_TEMPLATE'; payload: string }
  | { type: 'ADD_SUBSCRIPTION_PRODUCT'; payload: SubscriptionProduct }
  | { type: 'UPDATE_SUBSCRIPTION_PRODUCT'; payload: SubscriptionProduct }
  | { type: 'DELETE_SUBSCRIPTION_PRODUCT'; payload: string };


export const initialState: AppState = {
  loading: true,
  error: null,
  customers: [],
  resellers: [],
  suppliers: [],
  digitalCodes: [],
  tvBoxes: [],
  sales: [],
  purchases: [],
  subscriptions: [],
  invoices: [],
  payments: [],
  paymentTransactions: [],
  emailTemplates: [],
  subscriptionProducts: [],
  settings: null,
  exchangeRates: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_INITIAL_DATA':
      return { ...state, ...action.payload };
    case 'SET_EXCHANGE_RATES':
      return { ...state, exchangeRates: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'RESET_STATE':
        return { ...initialState, loading: false }; // Reset to initial state but keep loading as false
    case 'ADD_CUSTOMER':
      return { ...state, customers: [...state.customers, action.payload] };
    case 'UPDATE_CUSTOMER':
      return { ...state, customers: state.customers.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CUSTOMER':
      return { ...state, customers: state.customers.filter(c => c.id !== action.payload) };
    case 'ADD_RESELLER':
      return { ...state, resellers: [...state.resellers, action.payload] };
    case 'UPDATE_RESELLER':
      return { ...state, resellers: state.resellers.map(r => r.id === action.payload.id ? action.payload : r) };
    case 'DELETE_RESELLER':
      return { ...state, resellers: state.resellers.filter(r => r.id !== action.payload) };
    case 'ADD_SUPPLIER':
      return { ...state, suppliers: [...state.suppliers, action.payload] };
    case 'UPDATE_SUPPLIER':
      return { ...state, suppliers: state.suppliers.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SUPPLIER':
      return { ...state, suppliers: state.suppliers.filter(s => s.id !== action.payload) };
    case 'ADD_DIGITAL_CODE':
      return { ...state, digitalCodes: [...state.digitalCodes, action.payload] };
    case 'UPDATE_DIGITAL_CODE':
      return { ...state, digitalCodes: state.digitalCodes.map(d => d.id === action.payload.id ? action.payload : d) };
    case 'DELETE_DIGITAL_CODE':
      return { ...state, digitalCodes: state.digitalCodes.filter(d => d.id !== action.payload) };
    case 'ADD_TV_BOX':
      return { ...state, tvBoxes: [...state.tvBoxes, action.payload] };
    case 'UPDATE_TV_BOX':
      return { ...state, tvBoxes: state.tvBoxes.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TV_BOX':
      return { ...state, tvBoxes: state.tvBoxes.filter(t => t.id !== action.payload) };
    case 'ADD_SALE':
      return { ...state, sales: [...state.sales, action.payload] };
    case 'UPDATE_SALE':
      return { ...state, sales: state.sales.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SALE':
      return { ...state, sales: state.sales.filter(s => s.id !== action.payload) };
    case 'ADD_PURCHASE':
      return { ...state, purchases: [...state.purchases, action.payload] };
    case 'UPDATE_PURCHASE':
      return { ...state, purchases: state.purchases.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PURCHASE':
      return { ...state, purchases: state.purchases.filter(p => p.id !== action.payload) };
    case 'ADD_SUBSCRIPTION':
      return { ...state, subscriptions: [...state.subscriptions, action.payload] };
    case 'UPDATE_SUBSCRIPTION':
      return { ...state, subscriptions: state.subscriptions.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SUBSCRIPTION':
      return { ...state, subscriptions: state.subscriptions.filter(s => s.id !== action.payload) };
    case 'ADD_INVOICE':
      return { ...state, invoices: [...state.invoices, action.payload] };
    case 'UPDATE_INVOICE':
      return { ...state, invoices: state.invoices.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'DELETE_INVOICE':
      return { ...state, invoices: state.invoices.filter(i => i.id !== action.payload) };
    case 'ADD_PAYMENT':
      return { ...state, payments: [...state.payments, action.payload] };
    case 'UPDATE_PAYMENT':
      return { ...state, payments: state.payments.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PAYMENT':
      return { ...state, payments: state.payments.filter(p => p.id !== action.payload) };
    case 'ADD_PAYMENT_TRANSACTION':
      return { ...state, paymentTransactions: [...state.paymentTransactions, action.payload] };
    case 'UPDATE_PAYMENT_TRANSACTION':
      return { ...state, paymentTransactions: state.paymentTransactions.map(pt => pt.id === action.payload.id ? action.payload : pt) };
    case 'DELETE_PAYMENT_TRANSACTION':
      return { ...state, paymentTransactions: state.paymentTransactions.filter(pt => pt.id !== action.payload) };
    case 'ADD_EMAIL_TEMPLATE':
      return { ...state, emailTemplates: [...state.emailTemplates, action.payload] };
    case 'UPDATE_EMAIL_TEMPLATE':
      return { ...state, emailTemplates: state.emailTemplates.map(et => et.id === action.payload.id ? action.payload : et) };
    case 'DELETE_EMAIL_TEMPLATE':
      return { ...state, emailTemplates: state.emailTemplates.filter(et => et.id !== action.payload) };
    case 'ADD_SUBSCRIPTION_PRODUCT':
      return { ...state, subscriptionProducts: [...state.subscriptionProducts, action.payload] };
    case 'UPDATE_SUBSCRIPTION_PRODUCT':
      return { ...state, subscriptionProducts: state.subscriptionProducts.map(sp => sp.id === action.payload.id ? action.payload : sp) };
    case 'DELETE_SUBSCRIPTION_PRODUCT':
      return { ...state, subscriptionProducts: state.subscriptionProducts.filter(sp => sp.id !== action.payload) };
    default:
      return state;
  }
}