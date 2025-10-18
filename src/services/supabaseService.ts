import { createClient } from '@supabase/supabase-js';
import {
  Customer, Reseller, Supplier, DigitalCode, TVBox, Sale, Purchase,
  Subscription, Invoice, PaymentTransaction, EmailTemplate, SubscriptionProduct,
  ExchangeRates, SupportedCurrency, Settings, Payment,
  CustomerPortalUser, CustomerMessage, CustomerCredential // ADDED: CustomerCredential
} from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Services ---

export const customerService = {
  getAll: async (): Promise<Customer[]> => {
    const { data, error } = await supabase.from('customers').select('*');
    if (error) throw error;
    return data;
  },
  create: async (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').insert(customer).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, customer: Partial<Customer>): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').update(customer).eq('id', id).select().single();
    if (error) throw error;
    return data;
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
    return data.map(reseller => ({
      ...reseller,
      outstandingBalance: reseller.outstandingBalance || 0,
    }));
  },
  create: async (reseller: Omit<Reseller, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reseller> => {
    const { data, error } = await supabase.from('resellers').insert(reseller).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, reseller: Partial<Reseller>): Promise<Reseller> => {
    const { data, error } = await supabase.from('resellers').update(reseller).eq('id', id).select().single();
    if (error) throw error;
    return data;
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
    return data.map(supplier => ({
      ...supplier,
      amountOwed: supplier.amountOwed || 0,
    }));
  },
  create: async (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier> => {
    const { data, error } = await supabase.from('suppliers').insert(supplier).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, supplier: Partial<Supplier>): Promise<Supplier> => {
    const { data, error } = await supabase.from('suppliers').update(supplier).eq('id', id).select().single();
    if (error) throw error;
    return data;
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
    return data;
  },
  create: async (code: Omit<DigitalCode, 'id' | 'createdAt' | 'updatedAt' | 'soldQuantity'>): Promise<DigitalCode> => {
    const { data, error } = await supabase.from('digital_codes').insert(code).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, code: Partial<DigitalCode>): Promise<DigitalCode> => {
    const { data, error } = await supabase.from('digital_codes').update(code).eq('id', id).select().single();
    if (error) throw error;
    return data;
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
    return data;
  },
  create: async (tvBox: Omit<TVBox, 'id' | 'createdAt' | 'updatedAt' | 'soldQuantity'>): Promise<TVBox> => {
    const { data, error } = await supabase.from('tv_boxes').insert(tvBox).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, tvBox: Partial<TVBox>): Promise<TVBox> => {
    const { data, error } = await supabase.from('tv_boxes').update(tvBox).eq('id', id).select().single();
    if (error) throw error;
    return data;
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
    return data;
  },
  create: async (sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'saleDate'>): Promise<Sale> => {
    const { data, error } = await supabase.from('sales').insert(sale).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, sale: Partial<Sale>): Promise<Sale> => {
    const { data, error } = await supabase.from('sales').update(sale).eq('id', id).select().single();
    if (error) throw error;
    return data;
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
    return data;
  },
  add: async (purchase: Omit<Purchase, 'createdAt' | 'updatedAt'>): Promise<Purchase> => {
    const { data, error } = await supabase.from('purchases').insert({
      id: purchase.id,
      supplierId: purchase.supplierId,
      productId: purchase.productId,
      productName: purchase.productName,
      productType: purchase.productType,
      supplierName: purchase.supplierName,
      quantity: purchase.quantity,
      unitCost: purchase.unitCost,
      totalCost: purchase.totalCost,
      purchaseDate: purchase.purchaseDate,
      status: purchase.status,
    }).select().single();
    if (error) throw error;
    return data;
  },
  create: async (purchase: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'purchaseDate'>): Promise<Purchase> => {
    const { data, error } = await supabase.from('purchases').insert(purchase).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, purchase: Partial<Purchase>): Promise<Purchase> => {
    const { data, error } = await supabase.from('purchases').update(purchase).eq('id', id).select().single();
    if (error) throw error;
    return data;
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
    return data;
  },
  create: async (subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> => {
    const { data, error } = await supabase.from('subscriptions').insert(subscription).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, subscription: Partial<Subscription>): Promise<Subscription> => {
    const { data, error } = await supabase.from('subscriptions').update(subscription).eq('id', id).select().single();
    if (error) throw error;
    return data;
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
    return data;
  },
  create: async (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> => {
    const { data, error } = await supabase.from('invoices').insert(invoice).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, invoice: Partial<Invoice>): Promise<Invoice> => {
    const { data, error } = await supabase.from('invoices').update(invoice).eq('id', id).select().single();
    if (error) throw error;
    return data;
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
    return data;
  },
  create: async (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> => {
    const { data, error } = await supabase.from('payments').insert(payment).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, payment: Partial<Payment>): Promise<Payment> => {
    const { data, error } = await supabase.from('payments').update(payment).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) throw error;
  },
};

export const settingsService = {
  get: async (): Promise<Settings | null> => {
    const { data, error } = await supabase.from('settings').select('*').single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },
  update: async (id: string, settings: Partial<Settings>): Promise<Settings> => {
    const { data, error } = await supabase.from('settings').update(settings).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  create: async (settings: Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>): Promise<Settings> => {
    const { data, error } = await supabase.from('settings').insert(settings).select().single();
    if (error) throw error;
    return data;
  },
};

export const exchangeRateService = {
  getLatest: async (): Promise<ExchangeRates | null> => {
    console.debug('supabaseService: DEBUG: Attempting to fetch exchange rates...');
    try {
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("rates, last_updated, success")
        .order("last_updated", { ascending: false })
        .limit(1);

      if (error) {
        console.error("supabaseService: DEBUG: Error fetching exchange rates:", error);
        return null;
      }

      if (!data || data.length === 0) {
        console.debug("supabaseService: DEBUG: No exchange rate rows found, returning null");
        return null;
      }

      const latestRate = data[0];
      const convertedRate: ExchangeRates = {
        rates: latestRate.rates,
        lastUpdated: latestRate.last_updated,
        success: latestRate.success,
      };
      console.debug("supabaseService: DEBUG: Successfully fetched exchange rates:", convertedRate);
      return convertedRate;

    } catch (err) {
      console.error("supabaseService: DEBUG: Unexpected error fetching exchange rates", err);
      return null;
    }
  },
  create: async (rates: Omit<ExchangeRates, 'lastUpdated' | 'success'>): Promise<ExchangeRates> => {
    const { data, error } = await supabase.from('exchange_rates').insert({
      rates: rates.rates,
      last_updated: new Date().toISOString(),
      success: true,
    }).select('rates, last_updated, success').single();
    if (error) throw error;
    return {
      rates: data.rates,
      lastUpdated: data.last_updated,
      success: data.success,
    };
  },
  update: async (id: string, rates: Partial<ExchangeRates>): Promise<ExchangeRates> => {
    const { data, error } = await supabase.from('exchange_rates').update({
      rates: rates.rates,
      last_updated: rates.lastUpdated,
      success: rates.success,
    }).eq('id', id).select('rates, last_updated, success').single();
    if (error) throw error;
    return {
      rates: data.rates,
      lastUpdated: data.last_updated,
      success: data.success,
    };
  }
};

export const paymentTransactionService = {
  getAll: async (): Promise<PaymentTransaction[]> => {
    const { data, error } = await supabase.from('payment_transactions').select('*');
    if (error) throw error;
    return data;
  },
  create: async (pt: Omit<PaymentTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentTransaction> => {
    const { data, error } = await supabase.from('payment_transactions').insert(pt).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, pt: Partial<PaymentTransaction>): Promise<PaymentTransaction> => {
    const { data, error } = await supabase.from('payment_transactions').update(pt).eq('id', id).select().single();
    if (error) throw error;
    return data;
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
    return data;
  },
  create: async (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> => {
    const { data, error } = await supabase.from('email_templates').insert(template).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, template: Partial<EmailTemplate>): Promise<EmailTemplate> => {
    const { data, error } = await supabase.from('email_templates').update(template).eq('id', id).select().single();
    if (error) throw error;
    return data;
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
    return data;
  },
  create: async (product: Omit<SubscriptionProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionProduct> => {
    const { data, error } = await supabase.from('subscription_products').insert(product).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, product: Partial<SubscriptionProduct>): Promise<SubscriptionProduct> => {
    const { data, error } = await supabase.from('subscription_products').update(product).eq('id', id).select().single();
    if (error) throw error;
    return data;
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
    .from('customer_portal_users') // Assuming your table name is 'customer_portal_users'
    .select('*')
    .eq('auth_id', authId)
    .limit(1)
    .maybeSingle(); // Use maybeSingle to handle 0 or 1 row gracefully

  if (error) {
    console.error("supabaseService: Error fetching customer portal user:", error);
    throw error;
  }
  return data;
};

export const createCustomerPortalUser = async (user: Omit<CustomerPortalUser, 'id' | 'created_at' | 'updated_at'>): Promise<CustomerPortalUser> => {
  console.debug("supabaseService: Creating new customer portal user:", user);
  const { data, error } = await supabase
    .from('customer_portal_users')
    .insert(user)
    .select()
    .single();

  if (error) {
    console.error("supabaseService: Error creating customer portal user:", error);
    throw error;
  }
  return data;
};

export const getCustomerMessages = async (customerId: string): Promise<CustomerMessage[]> => {
  console.debug("supabaseService: Fetching customer messages for customer_id:", customerId);
  const { data, error } = await supabase
    .from('customer_messages') // Assuming your table name is 'customer_messages'
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error("supabaseService: Error fetching customer messages:", error);
    throw error;
  }
  return data;
};

export const createCustomerMessage = async (message: Omit<CustomerMessage, 'id' | 'created_at' | 'updated_at' | 'admin_notes'>): Promise<CustomerMessage> => {
  console.debug("supabaseService: Creating new customer message:", message);
  const { data, error } = await supabase
    .from('customer_messages')
    .insert(message)
    .select()
    .single();

  if (error) {
    console.error("supabaseService: Error creating customer message:", error);
    throw error;
  }
  return data;
};

export const getCustomerCredentials = async (customerId: string): Promise<CustomerCredential[]> => {
  console.debug("supabaseService: Fetching customer credentials for customer_id:", customerId);
  const { data, error } = await supabase
    .from('customer_credentials') // Assuming your table name is 'customer_credentials'
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error("supabaseService: Error fetching customer credentials:", error);
    throw error;
  }
  return data;
};
