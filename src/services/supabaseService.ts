import {
  Customer, Reseller, Supplier, DigitalCode, TVBox, Sale, Purchase,
  Subscription, Invoice, PaymentTransaction, EmailTemplate, SubscriptionProduct,
  ExchangeRates, SupportedCurrency, Settings, Payment,
  CustomerPortalUser, CustomerMessage, CustomerCredential, UserProfile
} from '../types';
import { supabase } from '../lib/supabase';
import { keysToCamel, keysToSnake } from '../utils/caseConverter';
import { ensureNumber } from '../utils/numberUtils';

// --- Conversion helpers ---
const convertCustomerFromDb = (row: any): Customer => ({
  ...keysToCamel(row),
});

const convertResellerFromDb = (row: any): Reseller => ({
  ...keysToCamel(row),
  outstandingBalance: ensureNumber(row.outstanding_payment),
});

const convertSupplierFromDb = (row: any): Supplier => ({
  ...keysToCamel(row),
  amountOwed: ensureNumber(row.amount_owed),
});

const convertDigitalCodeFromDb = (row: any): DigitalCode => ({
  ...keysToCamel(row),
  quantity: ensureNumber(row.quantity),
  soldQuantity: ensureNumber(row.sold_quantity),
  customerPrice: ensureNumber(row.customer_price),
  resellerPrice: ensureNumber(row.reseller_price),
  purchasePrice: ensureNumber(row.purchase_price),
});

const convertTVBoxFromDb = (row: any): TVBox => ({
  ...keysToCamel(row),
  quantity: ensureNumber(row.quantity),
  soldQuantity: ensureNumber(row.sold_quantity),
  customerPrice: ensureNumber(row.customer_price),
  resellerPrice: ensureNumber(row.reseller_price),
  purchasePrice: ensureNumber(row.purchase_price),
});

const convertSaleFromDb = (row: any): Sale => ({
  ...keysToCamel(row),
  quantity: ensureNumber(row.quantity),
  unitPrice: ensureNumber(row.unit_price),
  totalPrice: ensureNumber(row.total_amount),
  profit: ensureNumber(row.profit),
});

const convertPurchaseFromDb = (row: any): Purchase => ({
  ...keysToCamel(row),
  quantity: ensureNumber(row.quantity),
  unitPrice: ensureNumber(row.unit_price),
  totalAmount: ensureNumber(row.total_amount),
});

const convertSubscriptionFromDb = (row: any): Subscription => ({
    ...keysToCamel(row),
    price: ensureNumber(row.price),
    durationMonths: ensureNumber(row.duration_months),
});

const convertSubscriptionProductFromDb = (row: any): SubscriptionProduct => ({
    ...keysToCamel(row),
    price: ensureNumber(row.price),
    durationMonths: ensureNumber(row.duration_months),
});

const convertInvoiceFromDb = (row: any): Invoice => ({
    ...keysToCamel(row),
    amount: ensureNumber(row.amount),
});

const convertPaymentFromDb = (row: any): Payment => ({
    ...keysToCamel(row),
    amount: ensureNumber(row.amount),
});

const convertPaymentTransactionFromDb = (row: any): PaymentTransaction => ({
    ...keysToCamel(row),
    amount: ensureNumber(row.amount),
});


// --- NEW: User Profile Service (for public.users table) ---
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  console.debug("supabaseService: Fetching user profile for uid:", uid);
  const { data, error } = await supabase
    .from("users")
    .select("id, email, is_admin")
    .eq("id", uid)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("supabaseService: Error fetching user profile:", error);
    throw error;
  }
  return keysToCamel(data);
};


// --- Services ---

export const customerService = {
  getAll: async (): Promise<Customer[]> => {
    const { data, error } = await supabase.from('customers').select('*');
    if (error) throw error;
    return data.map(convertCustomerFromDb);
  },
  create: async (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> => {
    console.log("customerService.create - BEFORE keysToSnake:", customer);
    console.log("user_id value:", customer.user_id);
    
    // Convert to snake_case
    const snakeCaseData = keysToSnake(customer);
    console.log("customerService.create - AFTER keysToSnake:", snakeCaseData);
    console.log("user_id after conversion:", snakeCaseData.user_id);
    
    // CRITICAL: If user_id is missing, throw error
    if (!snakeCaseData.user_id) {
      throw new Error("CRITICAL ERROR: user_id is missing after keysToSnake conversion!");
    }
    
    const { data, error } = await supabase
      .from('customers')
      .insert(snakeCaseData)
      .select()
      .single();
      
    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }
    
    return convertCustomerFromDb(data);
  },
  update: async (id: string, customer: Partial<Customer>): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').update(keysToSnake(customer)).eq('id', id).select().single();
    if (error) throw error;
    return convertCustomerFromDb(data);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
  },
};

export const resellerService = {
  getAll: async (): Promise<Reseller[]> => {
    const { data, error } = await supabase.from('resellers').select('*');
    if (error) throw error;
    return data.map(convertResellerFromDb);
  },
  create: async (reseller: Omit<Reseller, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reseller> => {
    const { data, error } = await supabase.from('resellers').insert(keysToSnake(reseller)).select().single();
    if (error) throw error;
    return convertResellerFromDb(data);
  },
  update: async (id: string, reseller: Partial<Reseller>): Promise<Reseller> => {
    const { data, error } = await supabase.from('resellers').update(keysToSnake(reseller)).eq('id', id).select().single();
    if (error) throw error;
    return convertResellerFromDb(data);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('resellers').delete().eq('id', id);
    if (error) throw error;
  },
};

export const supplierService = {
  getAll: async (): Promise<Supplier[]> => {
    const { data, error } = await supabase.from('suppliers').select('*');
    if (error) throw error;
    return data.map(convertSupplierFromDb);
  },
  create: async (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier> => {
    const { data, error } = await supabase.from('suppliers').insert(keysToSnake(supplier)).select().single();
    if (error) throw error;
    return convertSupplierFromDb(data);
  },
  update: async (id: string, supplier: Partial<Supplier>): Promise<Supplier> => {
    const { data, error } = await supabase.from('suppliers').update(keysToSnake(supplier)).eq('id', id).select().single();
    if (error) throw error;
    return convertSupplierFromDb(data);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
  },
};

export const digitalCodeService = {
  getAll: async (): Promise<DigitalCode[]> => {
    const { data, error } = await supabase.from('digital_codes').select('*');
    if (error) throw error;
    return data.map(convertDigitalCodeFromDb);
  },
  create: async (code: Omit<DigitalCode, 'id' | 'createdAt' | 'updatedAt' | 'soldQuantity'>): Promise<DigitalCode> => {
    const { data, error } = await supabase.from('digital_codes').insert(keysToSnake(code)).select().single();
    if (error) throw error;
    return convertDigitalCodeFromDb(data);
  },
  update: async (id: string, code: Partial<DigitalCode>): Promise<DigitalCode> => {
    const { data, error } = await supabase.from('digital_codes').update(keysToSnake(code)).eq('id', id).select().single();
    if (error) throw error;
    return convertDigitalCodeFromDb(data);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('digital_codes').delete().eq('id', id);
    if (error) throw error;
  },
};

export const tvBoxService = {
  getAll: async (): Promise<TVBox[]> => {
    const { data, error } = await supabase.from('tv_boxes').select('*');
    if (error) throw error;
    return data.map(convertTVBoxFromDb);
  },
  create: async (tvBox: Omit<TVBox, 'id' | 'createdAt' | 'updatedAt' | 'soldQuantity'>): Promise<TVBox> => {
    const { data, error } = await supabase.from('tv_boxes').insert(keysToSnake(tvBox)).select().single();
    if (error) throw error;
    return convertTVBoxFromDb(data);
  },
  update: async (id: string, tvBox: Partial<TVBox>): Promise<TVBox> => {
    const { data, error } = await supabase.from('tv_boxes').update(keysToSnake(tvBox)).eq('id', id).select().single();
    if (error) throw error;
    return convertTVBoxFromDb(data);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('tv_boxes').delete().eq('id', id);
    if (error) throw error;
  },
};

export const saleService = {
  getAll: async (): Promise<Sale[]> => {
    const { data, error } = await supabase.from('sales').select('*');
    if (error) throw error;
    return data.map(convertSaleFromDb);
  },
  create: async (sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'saleDate'>): Promise<Sale> => {
    console.log("saleService.create - BEFORE keysToSnake:", sale);
    console.log("user_id value:", sale.user_id);
    
    const snakeCaseData = keysToSnake(sale);
    console.log("saleService.create - AFTER keysToSnake:", snakeCaseData);
    
    if (!snakeCaseData.user_id) {
      throw new Error("CRITICAL ERROR: user_id is missing after keysToSnake conversion!");
    }
    
    const { data, error } = await supabase
      .from('sales')
      .insert(snakeCaseData)
      .select()
      .single();
      
    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }
    
    return convertSaleFromDb(data);
  },
  update: async (id: string, sale: Partial<Sale>): Promise<Sale> => {
    const { data, error } = await supabase.from('sales').update(keysToSnake(sale)).eq('id', id).select().single();
    if (error) throw error;
    return convertSaleFromDb(data);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) throw error;
  },
};

export const purchaseService = {
  getAll: async (): Promise<Purchase[]> => {
    const { data, error } = await supabase.from('purchases').select('*');
    if (error) throw error;
    return data.map(convertPurchaseFromDb);
  },
  add: async (purchase: Omit<Purchase, 'createdAt' | 'updatedAt'>): Promise<Purchase> => {
    const { data, error } = await supabase.from('purchases').insert(keysToSnake(purchase)).select().single();
    if (error) throw error;
    return convertPurchaseFromDb(data);
  },
  create: async (purchase: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'purchaseDate'>): Promise<Purchase> => {
    const { data, error } = await supabase.from('purchases').insert(keysToSnake(purchase)).select().single();
    if (error) throw error;
    return convertPurchaseFromDb(data);
  },
  update: async (id: string, purchase: Partial<Purchase>): Promise<Purchase> => {
    const { data, error } = await supabase.from('purchases').update(keysToSnake(purchase)).eq('id', id).select().single();
    if (error) throw error;
    return convertPurchaseFromDb(data);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) throw error;
  },
};

export const subscriptionService = {
  getAll: async (): Promise<Subscription[]> => {
    const { data, error } = await supabase.from('subscriptions').select('*');
    if (error) throw error;
    return data.map(convertSubscriptionFromDb);
  },
  create: async (subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> => {
    console.log("subscriptionService.create - BEFORE keysToSnake:", subscription);
    console.log("user_id value:", subscription.user_id);
    
    const snakeCaseData = keysToSnake(subscription);
    console.log("subscriptionService.create - AFTER keysToSnake:", snakeCaseData);
    
    if (!snakeCaseData.user_id) {
      throw new Error("CRITICAL ERROR: user_id is missing after keysToSnake conversion!");
    }
    
    const { data, error } = await supabase
      .from('subscriptions')
      .insert(snakeCaseData)
      .select()
      .single();
      
    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }
    
    return convertSubscriptionFromDb(data);
  },
  update: async (id: string, subscription: Partial<Subscription>): Promise<Subscription> => {
    const { data, error } = await supabase.from('subscriptions').update(keysToSnake(subscription)).eq('id', id).select().single();
    if (error) throw error;
    return convertSubscriptionFromDb(data);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('subscriptions').delete().eq('id', id);
    if (error) throw error;
  },
};

export const invoiceService = {
  getAll: async (): Promise<Invoice[]> => {
    const { data, error } = await supabase.from('invoices').select('*');
    if (error) throw error;
    return data.map(convertInvoiceFromDb);
  },
  create: async (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> => {
    const { data, error } = await supabase.from('invoices').insert(keysToSnake(invoice)).select().single();
    if (error) throw error;
    return convertInvoiceFromDb(data);
  },
  update: async (id: string, invoice: Partial<Invoice>): Promise<Invoice> => {
    const { data, error } = await supabase.from('invoices').update(keysToSnake(invoice)).eq('id', id).select().single();
    if (error) throw error;
    return convertInvoiceFromDb(data);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
  },
};

export const paymentService = {
  getAll: async (): Promise<Payment[]> => {
    const { data, error } = await supabase.from('payments').select('*');
    if (error) throw error;
    return data.map(convertPaymentFromDb);
  },
  create: async (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> => {
    const { data, error } = await supabase.from('payments').insert(keysToSnake(payment)).select().single();
    if (error) throw error;
    return convertPaymentFromDb(data);
  },
  update: async (id: string, payment: Partial<Payment>): Promise<Payment> => {
    const { data, error } = await supabase.from('payments').update(keysToSnake(payment)).eq('id', id).select().single();
    if (error) throw error;
    return convertPaymentFromDb(data);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) throw error;
  },
};

export const settingsService = {
  get: async (): Promise<Settings | null> => {
    const { data, error } = await supabase.from('settings').select('*').single();
    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error("supabaseService: Error fetching settings:", error);
      throw error;
    }
    return keysToCamel(data) || null;
  },
  update: async (id: string, settings: Partial<Settings>): Promise<Settings> => {
    const { data, error } = await supabase.from('settings').update(keysToSnake(settings)).eq('id', id).select().single();
    if (error) {
      console.error("supabaseService: Error updating settings:", error);
      throw error;
    }
    return keysToCamel(data);
  },
  create: async (settings: Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>): Promise<Settings> => {
    const { data, error } = await supabase.from('settings').insert(keysToSnake(settings)).select().single();
    if (error) {
      console.error("supabaseService: Error creating settings:", error);
      throw error;
    }
    return keysToCamel(data);
  },
};

export const exchangeRateService = {
  getLatest: async (): Promise<ExchangeRates | null> => {
    console.debug('supabaseService: DEBUG: Attempting to fetch exchange rates...');
    try {
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("rates, updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("supabaseService: DEBUG: Error fetching exchange rates:", error);
        return null;
      }

      if (!data) {
        console.debug("supabaseService: DEBUG: No exchange rate rows found, returning null");
        return null;
      }

      return keysToCamel(data);

    } catch (err) {
      console.error("supabaseService: DEBUG: Unexpected error fetching exchange rates", err);
      return null;
    }
  },
   create: async (rates: Omit<ExchangeRates, 'lastUpdated' | 'success'>): Promise<ExchangeRates> => {
     const { data, error } = await supabase.from('exchange_rates').insert(keysToSnake(rates)).select().single();
     if (error) {
       console.error("supabaseService: Error creating exchange rates:", error);
       throw error;
     }
     return keysToCamel(data);
   },
   update: async (id: string, rates: Partial<ExchangeRates>): Promise<ExchangeRates> => {
     const { data, error } = await supabase.from('exchange_rates').update(keysToSnake(rates)).eq('id', id).select().single();
     if (error) {
       console.error("supabaseService: Error updating exchange rates:", error);
       throw error;
     }
     return keysToCamel(data);
   }
};

export const paymentTransactionService = {
  getAll: async (): Promise<PaymentTransaction[]> => {
    const { data, error } = await supabase.from('payment_transactions').select('*');
    if (error) throw error;
    return data.map(convertPaymentTransactionFromDb);
  },
  create: async (pt: Omit<PaymentTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentTransaction> => {
    const { data, error } = await supabase.from('payment_transactions').insert(keysToSnake(pt)).select().single();
    if (error) throw error;
    return convertPaymentTransactionFromDb(data);
  },
  update: async (id: string, pt: Partial<PaymentTransaction>): Promise<PaymentTransaction> => {
    const { data, error } = await supabase.from('payment_transactions').update(keysToSnake(pt)).eq('id', id).select().single();
    if (error) throw error;
    return convertPaymentTransactionFromDb(data);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('payment_transactions').delete().eq('id', id);
    if (error) throw error;
  },
};

export const emailTemplateService = {
  getAll: async (): Promise<EmailTemplate[]> => {
    const { data, error } = await supabase.from('email_templates').select('*');
    if (error) throw error;
    return keysToCamel(data);
  },
  create: async (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> => {
    const { data, error } = await supabase.from('email_templates').insert(keysToSnake(template)).select().single();
    if (error) throw error;
    return keysToCamel(data);
  },
  update: async (id: string, template: Partial<EmailTemplate>): Promise<EmailTemplate> => {
    const { data, error } = await supabase.from('email_templates').update(keysToSnake(template)).eq('id', id).select().single();
    if (error) throw error;
    return keysToCamel(data);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('email_templates').delete().eq('id', id);
    if (error) throw error;
  },
};

export const subscriptionProductService = {
  getAll: async (): Promise<SubscriptionProduct[]> => {
    const { data, error } = await supabase.from('subscription_products').select('*');
    if (error) throw error;
    return data.map(convertSubscriptionProductFromDb);
  },
  create: async (product: Omit<SubscriptionProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionProduct> => {
    const { data, error } = await supabase.from('subscription_products').insert(keysToSnake(product)).select().single();
    if (error) throw error;
    return convertSubscriptionProductFromDb(data);
  },
  update: async (id: string, product: Partial<SubscriptionProduct>): Promise<SubscriptionProduct> => {
    const { data, error } = await supabase.from('subscription_products').update(keysToSnake(product)).eq('id', id).select().single();
    if (error) throw error;
    return convertSubscriptionProductFromDb(data);
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('subscription_products').delete().eq('id', id);
    if (error) throw error;
  },
};

// --- NEW: Customer Portal Specific Services ---

export const getCustomerPortalUserByAuthId = async (authId: string): Promise<CustomerPortalUser | null> => {
  console.debug("supabaseService: Fetching customer portal user by auth_id:", authId);
  const { data, error } = await supabase
    .from('customer_portal_users')
    .select('*')
    .eq('auth_provider_id', authId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("supabaseService: Error fetching customer portal user:", error);
    throw error;
  }
  return keysToCamel(data);
};

export const createCustomerPortalUser = async (user: Omit<CustomerPortalUser, 'id' | 'created_at' | 'updated_at' | 'last_login_at'>): Promise<CustomerPortalUser> => {
  console.debug("supabaseService: Creating new customer portal user:", user);
  const { data, error } = await supabase
    .from('customer_portal_users')
    .insert(keysToSnake(user))
    .select()
    .single();

  if (error) {
    console.error("supabaseService: Error creating customer portal user:", error);
    throw error;
  }
  return keysToCamel(data);
};

export const getCustomerMessages = async (customerId: string): Promise<CustomerMessage[]> => {
  console.debug("supabaseService: Fetching customer messages for customer_id:", customerId);
  const { data, error } = await supabase
    .from('customer_messages')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error("supabaseService: Error fetching customer messages:", error);
    throw error;
  }
  return keysToCamel(data);
};

export const createCustomerMessage = async (message: Omit<CustomerMessage, 'id' | 'created_at' | 'updated_at' | 'admin_notes'>): Promise<CustomerMessage> => {
  console.debug("supabaseService: Creating new customer message:", message);
  const { data, error } = await supabase
    .from('customer_messages')
    .insert(keysToSnake(message))
    .select()
    .single();

  if (error) {
    console.error("supabaseService: Error creating customer message:", error);
    throw error;
  }
  return keysToCamel(data);
};

export const getCustomerCredentials = async (customerId: string): Promise<CustomerCredential[]> => {
  console.debug("supabaseService: Fetching customer credentials for customer_id:", customerId);
  const { data, error } = await supabase
    .from('customer_credentials')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error("supabaseService: Error fetching customer credentials:", error);
    throw error;
  }
  return keysToCamel(data);
};