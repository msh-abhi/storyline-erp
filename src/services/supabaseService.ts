import { supabase } from '../lib/supabase'; // <--- CHANGE THIS LINE: Import from src/lib/supabase.ts
import {
  Customer, Reseller, Supplier, DigitalCode, TVBox, Sale, Purchase,
  Subscription, SubscriptionProduct, EmailTemplate, Invoice, Payment,
  PaymentTransaction, Settings, ExchangeRates, SupportedCurrency,
  CustomerPortalUser,
  CustomerCredential,
  CustomerMessage,
  UserProfile // <-- ADD THIS IMPORT
} from '../types';

// Helper functions to convert database row to app type
const convertCustomerFromDb = (row: any): Customer => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  address: row.address,
  city: row.city,
  country: row.country,
  postalCode: row.postal_code,
  notes: row.notes,
  status: row.status,
  whatsappNumber: row.whatsapp_number,
  macAddress: row.mac_address,
  customFields: row.custom_fields || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const convertResellerFromDb = (row: any): Reseller => ({
  id: row.id,
  name: row.name,
  email: row.email,
  creditBalance: row.credit_balance,
  paymentHistory: row.payment_history || [],
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const convertSupplierFromDb = (row: any): Supplier => ({
  id: row.id,
  name: row.name,
  email: row.email,
  creditBalance: row.credit_balance,
  paymentHistory: row.payment_history || [],
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const convertDigitalCodeFromDb = (row: any): DigitalCode => ({
  id: row.id,
  code: row.code,
  value: row.value,
  soldQuantity: row.sold_quantity,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const convertTVBoxFromDb = (row: any): TVBox => ({
  id: row.id,
  serialNumber: row.serial_number,
  model: row.model,
  soldQuantity: row.sold_quantity,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const convertSaleFromDb = (row: any): Sale => ({
  id: row.id,
  customerId: row.customer_id,
  productId: row.product_id,
  quantity: row.quantity,
  totalPrice: row.total_price,
  saleDate: row.sale_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const convertPurchaseFromDb = (row: any): Purchase => ({
  id: row.id,
  supplierId: row.supplier_id,
  productId: row.product_id,
  quantity: row.quantity,
  totalCost: row.total_cost,
  purchaseDate: row.purchase_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const convertEmailTemplateFromDb = (row: any): EmailTemplate => ({
  id: row.id,
  name: row.name,
  subject: row.subject,
  content: row.content,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const convertSubscriptionFromDb = (row: any): Subscription => ({
  id: row.id,
  customer_id: row.customer_id,
  status: row.status,
  startDate: row.start_date,
  endDate: row.end_date,
  price: row.price,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const convertSubscriptionProductFromDb = (row: any): SubscriptionProduct => ({
  id: row.id,
  name: row.name,
  description: row.description,
  price: row.price,
  duration: row.duration,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const convertInvoiceFromDb = (row: any): Invoice => ({
  id: row.id,
  customerId: row.customer_id,
  amount: row.amount,
  status: row.status,
  subscriptionId: row.subscription_id,
  currency: row.currency,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const convertPaymentFromDb = (row: any): Payment => ({
  id: row.id,
  invoiceId: row.invoice_id,
  amount: row.amount,
  paymentDate: row.payment_date,
  method: row.method,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const convertPaymentTransactionFromDb = (row: any): PaymentTransaction => ({
  id: row.id,
  entityId: row.entity_id,
  entityType: row.entity_type,
  amount: row.amount,
  type: row.type,
  description: row.description,
  paymentMethod: row.payment_method,
  transactionDate: row.transaction_date,
  createdAt: row.created_at,
});

const convertSettingsFromDb = (row: any): Settings => ({
  id: row.id,
  currency: row.currency,
  emailSettings: row.email_settings,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const convertExchangeRatesFromDb = (row: any): ExchangeRates => ({
  id: row.id,
  baseCurrency: row.base_currency,
  rates: row.rates,
  updatedAt: row.updated_at
});

const convertCustomerPortalUserFromDb = (row: any): CustomerPortalUser => ({
  id: row.id,
  auth_id: row.auth_provider_id, // <-- MAP 'auth_provider_id' to 'auth_id'
  customer_id: row.customer_id,
  email: row.email,
  created_at: row.created_at,
  last_login_at: row.last_login_at,
});

// UPDATE THIS CONVERTER
const convertCustomerCredentialFromDb = (row: any): CustomerCredential => ({
  id: row.id,
  customer_id: row.customer_id,
  server_id: row.server_id,
  password: row.password,
  server_url: row.server_url,
  notes: row.notes,
  mac_address: row.mac_address,
  created_at: row.created_at,
  updated_at: row.updated_at,
  expires_at: row.expires_at,
});

// UPDATE THIS CONVERTER
const convertCustomerMessageFromDb = (row: any): CustomerMessage => ({
  id: row.id,
  customer_id: row.customer_id,
  subject: row.subject,
  category: row.category,
  message: row.message,
  status: row.status,
  created_at: row.created_at,
  admin_notes: row.admin_notes,
});

// ADD THIS NEW CONVERTER
const convertUserProfileFromDb = (row: any): UserProfile => ({
    id: row.id,
    email: row.email,
    name: row.name,
    is_admin: row.is_admin,
});

// Generic service factory
const createGenericService = <T extends { id: string }>(
  tableName: string,
  converter: (row: any) => T // Add a converter function
) => {
  return {
    async getAll(): Promise<T[]> {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) throw error;
      return data.map(converter); // Use the converter
    },
    async getById(id: string): Promise<T | null> {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
      if (error) throw error;
      return data ? converter(data) : null; // Use the converter
    },
    async create(
      item: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'paymentHistory' | 'soldQuantity' | 'saleDate' | 'purchaseDate' | 'created_at' | 'updated_at'> // Expanded Omit for generic types
    ): Promise<T> {
      const { data, error } = await supabase.from(tableName).insert(item as any).select().single();
      if (error) throw error;
      return converter(data); // Use the converter
    },
    async update(id: string, item: Partial<T>): Promise<T> {
      const { data, error } = await supabase.from(tableName).update(item as any).eq('id', id).select().single();
      if (error) throw error;
      return converter(data); // Use the converter
    },
    async delete(id: string): Promise<void> {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    }
  };
};

// Export services using the generic factory with converters
export const customerService = createGenericService<Customer>('customers', convertCustomerFromDb);
export const resellerService = createGenericService<Reseller>('resellers', convertResellerFromDb);
export const supplierService = createGenericService<Supplier>('suppliers', convertSupplierFromDb);
export const digitalCodeService = createGenericService<DigitalCode>('digital_codes', convertDigitalCodeFromDb);
export const tvBoxService = createGenericService<TVBox>('tv_boxes', convertTVBoxFromDb);
export const saleService = createGenericService<Sale>('sales', convertSaleFromDb);
export const purchaseService = createGenericService<Purchase>('purchases', convertPurchaseFromDb);
export const emailTemplateService = createGenericService<EmailTemplate>('email_templates', convertEmailTemplateFromDb);
export const subscriptionService = createGenericService<Subscription>('subscriptions', convertSubscriptionFromDb);
export const subscriptionProductService = createGenericService<SubscriptionProduct>('subscription_products', convertSubscriptionProductFromDb);
export const invoiceService = createGenericService<Invoice>('invoices', convertInvoiceFromDb);
export const paymentService = createGenericService<Payment>('payments', convertPaymentFromDb);
export const paymentTransactionService = createGenericService<PaymentTransaction>('payment_transactions', convertPaymentTransactionFromDb);
export const customerPortalUserService = createGenericService<CustomerPortalUser>('customer_portal_users', convertCustomerPortalUserFromDb);
export const customerCredentialService = createGenericService<CustomerCredential>('customer_credentials', convertCustomerCredentialFromDb);
// ADD THIS NEW SERVICE EXPORT
export const customerMessageService = createGenericService<CustomerMessage>('customer_messages', convertCustomerMessageFromDb);


// Auth-related functions for AuthProvider
export const signInWithMagicLink = async (email: string) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin, // Redirect back to the app after magic link click
    },
  });
  if (error) {
    throw error;
  }
};

// ADD THIS NEW FUNCTION TO GET USER PROFILE FOR ADMIN CHECK
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
        .from('users') // This is your public.users table
        .select('*')
        .eq('id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("Error fetching user profile:", error);
        throw error;
    }
    return data ? convertUserProfileFromDb(data) : null;
};


// UPDATE THIS FUNCTION to use 'auth_provider_id'
export const getCustomerPortalUserByAuthId = async (authId: string): Promise<CustomerPortalUser | null> => {
  const { data, error } = await supabase
    .from('customer_portal_users')
    .select('*')
    .eq('auth_provider_id', authId) // <-- USE 'auth_provider_id'
    .single();
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return data ? convertCustomerPortalUserFromDb(data) : null;
};

// UPDATE THIS FUNCTION to insert 'auth_provider_id'
export const createCustomerPortalUser = async (user: Omit<CustomerPortalUser, 'id' | 'created_at' | 'last_login_at'>): Promise<CustomerPortalUser> => {
  const { data, error } = await supabase
    .from('customer_portal_users')
    .insert({
        auth_provider_id: user.auth_id, // <-- MAP 'auth_id' to 'auth_provider_id'
        customer_id: user.customer_id,
        email: user.email,
    })
    .select()
    .single();
  if (error) throw error;
  return convertCustomerPortalUserFromDb(data);
};

export const updateCustomerPortalUser = async (id: string, user: Partial<Omit<CustomerPortalUser, 'id' | 'created_at' | 'last_login_at'>>): Promise<CustomerPortalUser> => {
  const { data, error } = await supabase
    .from('customer_portal_users')
    .update(user as any) // Cast to any for update
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return convertCustomerPortalUserFromDb(data);
};

// Customer Credentials functions
export const getCustomerCredentials = async (customerId: string): Promise<CustomerCredential[]> => {
  if (!customerId) {
    console.warn("getCustomerCredentials called without a customerId.");
    return [];
  }
  const { data, error } = await supabase
    .from('customer_credentials')
    .select('*')
    .eq('customer_id', customerId);

  if (error) {
    console.error("Error fetching customer credentials:", error);
    throw error;
  }

  return data ? data.map(convertCustomerCredentialFromDb) : [];
};

// ADD THE MISSING FUNCTIONS FOR CUSTOMER MESSAGES
export const getCustomerMessages = async (customerId: string): Promise<CustomerMessage[]> => {
  if (!customerId) return [];
  const { data, error } = await supabase
    .from('customer_messages')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true }); // Show oldest messages first

  if (error) {
    console.error("Error fetching customer messages:", error);
    throw error;
  }
  return data ? data.map(convertCustomerMessageFromDb) : [];
};

export const createCustomerMessage = async (message: Omit<CustomerMessage, 'id' | 'created_at'>): Promise<CustomerMessage> => {
  const { data, error } = await supabase
    .from('customer_messages')
    .insert(message as any)
    .select()
    .single();

  if (error) {
    console.error("Error creating customer message:", error);
    throw error;
  }
  return convertCustomerMessageFromDb(data);
};


// Settings and ExchangeRates are special cases, not using generic service directly for get()
export const settingsService = {
  async get(): Promise<Settings | null> {
    const { data, error } = await supabase.from('settings').select('*').order('created_at', { ascending: false }).limit(1).single();
    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine for settings
      console.error("Error fetching settings:", error);
      throw error;
    }
    return data ? convertSettingsFromDb(data) : null;
  },
  async create(settings: Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>): Promise<Settings> {
    const { data, error } = await supabase.from('settings').insert(settings as any).select().single();
    if (error) throw error;
    return convertSettingsFromDb(data);
  },
  async update(id: string, settings: Partial<Settings>): Promise<Settings> {
    const { data, error } = await supabase.from('settings').update(settings as any).eq('id', id).select().single();
    if (error) throw error;
    return convertSettingsFromDb(data);
  }
};

// Temporarily comment out exchangeRateService to bypass the 406 error
/*
export const exchangeRateService = {
  async getRates() {
    console.log('supabaseService: DEBUG: Attempting to fetch exchange rates...');
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1); // Removed .single() here

      if (error) {
        console.error('supabaseService: DEBUG: Error fetching exchange rates:', error);
        throw error;
      }

      // If data is an empty array, data[0] will be undefined.
      // We return null in that case, or the first (and only) item if present.
      const latestRate = data && data.length > 0 ? data[0] : null;
      console.log('supabaseService: DEBUG: Successfully fetched exchange rates:', latestRate);
      return latestRate;

    } catch (err: any) {
      console.error('supabaseService: DEBUG: Full exchange rates error object:', err);
      throw err; // Re-throw the error so AppContext can catch it
    }
  },
  async create(rates: Omit<ExchangeRates, 'id' | 'updatedAt'>): Promise<ExchangeRates> {
    const { data, error } = await supabase.from('exchange_rates').insert(rates as any).select().single();
    if (error) throw error;
    return convertExchangeRatesFromDb(data);
  },
  async update(id: string, rates: Partial<ExchangeRates>): Promise<ExchangeRates> {
    const { data, error } = await supabase.from('exchange_rates').update(rates as any).eq('id', id).select().single();
    if (error) throw error;
    return convertExchangeRatesFromDb(data);
  }
};
*/
