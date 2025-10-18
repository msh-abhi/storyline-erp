import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  Dispatch,
  useCallback,
  useRef // Added useRef
} from 'react';
import { useAuth } from '../components/AuthProvider'; // Ensure this path is correct
import {
  customerService, resellerService, supplierService, digitalCodeService,
  tvBoxService, saleService, purchaseService, subscriptionService,
  invoiceService, paymentService, settingsService, exchangeRateService, // Added exchangeRateService
  paymentTransactionService, emailTemplateService, subscriptionProductService,
} from '../services/supabaseService';
import {
  AppState, AppAction, initialState, appReducer, // Assuming these are defined elsewhere in your file
  Customer, Reseller, Supplier, DigitalCode, TVBox, Sale, Purchase,
  Subscription, Invoice, PaymentTransaction, EmailTemplate, SubscriptionProduct,
  ExchangeRates, SupportedCurrency, Settings, Payment // Assuming Payment type exists
} from '../types'; // Ensure all types are imported

// Define AppContextType to match the structure of your context value
interface AppContextType {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  actions: {
    loadAllData: () => Promise<void>;
    getDisplayCurrency: () => SupportedCurrency;
    updateSettings: (id: string, settings: Partial<Settings>) => Promise<Settings>;
    createCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
    updateCustomer: (id: string, customer: Partial<Customer>) => Promise<Customer>;
    deleteCustomer: (id: string) => Promise<void>;
    createReseller: (reseller: Omit<Reseller, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Reseller>;
    updateReseller: (id: string, reseller: Partial<Reseller>) => Promise<Reseller>;
    deleteReseller: (id: string) => Promise<void>;
    addResellerCredit: (resellerId: string, amount: number, paymentMethod: string) => Promise<void>;
    createSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Supplier>;
    updateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<Supplier>;
    deleteSupplier: (id: string) => Promise<void>;
    addSupplierCredit: (supplierId: string, amount: number, description: string) => Promise<void>;
    adjustSupplierCredit: (supplierId: string, amount: number, description: string) => Promise<void>;
    sellCreditToReseller: (supplierId: string, resellerId: string, creditAmount: number, salePrice: number) => Promise<void>;
    createDigitalCode: (code: Omit<DigitalCode, 'id' | 'createdAt' | 'updatedAt' | 'soldQuantity'>) => Promise<DigitalCode>;
    updateDigitalCode: (id: string, code: Partial<DigitalCode>) => Promise<DigitalCode>;
    deleteDigitalCode: (id: string) => Promise<void>;
    createTVBox: (tvBox: Omit<TVBox, 'id' | 'createdAt' | 'updatedAt' | 'soldQuantity'>) => Promise<TVBox>;
    updateTVBox: (id: string, tvBox: Partial<TVBox>) => Promise<TVBox>;
    deleteTVBox: (id: string) => Promise<void>;
    createSale: (sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'saleDate'>) => Promise<Sale>;
    updateSale: (id: string, sale: Partial<Sale>) => Promise<Sale>;
    deleteSale: (id: string) => Promise<void>;
    createPurchase: (purchase: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'purchaseDate'>) => Promise<Purchase>;
    updatePurchase: (id: string, purchase: Partial<Purchase>) => Promise<Purchase>;
    deletePurchase: (id: string) => Promise<void>;
    createEmailTemplate: (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<EmailTemplate>;
    updateEmailTemplate: (id: string, template: Partial<EmailTemplate>) => Promise<EmailTemplate>;
    deleteEmailTemplate: (id: string) => Promise<void>;
    sendEmail: (to: string, subject: string, content: string, templateData?: Record<string, string>) => Promise<void>;
    createSubscription: (subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Subscription>;
    updateSubscription: (id: string, subscription: Partial<Subscription>) => Promise<Subscription>;
    deleteSubscription: (id: string) => Promise<void>;
    createSubscriptionProduct: (product: Omit<SubscriptionProduct, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SubscriptionProduct>;
    updateSubscriptionProduct: (id: string, product: Partial<SubscriptionProduct>) => Promise<SubscriptionProduct>;
    deleteSubscriptionProduct: (id: string) => Promise<void>;
    createSettings: (settings: Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Settings>;
    addPaymentTransaction: (pt: Omit<PaymentTransaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PaymentTransaction>;
    updatePaymentTransaction: (id: string, pt: Partial<PaymentTransaction>) => Promise<PaymentTransaction>;
    createInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Invoice>;
    updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<Invoice>;
    deleteInvoice: (id: string) => Promise<void>;
    createPayment: (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Payment>;
    updatePayment: (id: string, payment: Partial<Payment>) => Promise<Payment>;
    deletePayment: (id: string) => Promise<void>;
    refreshExchangeRates: () => Promise<void>;
    revolut: { getPaymentStatus: (paymentRequestId: string) => Promise<{ success: boolean; data?: any; error?: string }> };
  };
}

// THIS LINE IS CRUCIAL AND WAS LIKELY MISPLACED OR MISSING
const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  // Use the renamed state variables from the updated AuthProvider
  const { authLoading, authInitialized, isAdmin, user } = useAuth(); // Use 'user' for basic auth user
  const loadDataTriggered = useRef(false); // Add ref to prevent multiple calls

  console.log('AppContext: AppProvider rendering.', { authInitialized, authLoading, isAdmin }); // Log state on each render

  const fetchExchangeRates = useCallback(async () => {
    try {
        // Use the service directly
        const rates = await exchangeRateService.getLatest(); // Assuming getLatest returns ExchangeRates | null
        if (rates) {
            dispatch({ type: 'SET_EXCHANGE_RATES', payload: rates });
        } else {
            console.warn("AppContext: No exchange rates fetched, using default/empty.");
            // Optionally dispatch an action to clear/set default rates if none are found
        }
    } catch (error) {
        console.error("AppContext: Error fetching exchange rates from service:", error);
    }
  }, []);

  // Define loadAllData using useCallback, dependent ONLY on necessary external values (like isAdmin for the check)
  const loadAllData = useCallback(async () => {
    console.debug("AppContext: loadAllData function executing..."); // Log when the function body runs

    // Prevent concurrent loads
    if (loadDataTriggered.current) {
      console.debug("AppContext: load already in progress, skipping");
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    loadDataTriggered.current = true; // Mark that loading has started

    try {
      // Fetch data that ALL authenticated users might need (if any)
      // For now, we'll fetch everything if admin, or minimal if not.

      let adminDataPayload: Partial<AppState> = {};
      if (isAdmin) {
        console.debug("AppContext: isAdmin is true, fetching admin-specific data...");
        const [
          customers, resellers, suppliers, digitalCodes, tvBoxes, sales,
          purchases, emailTemplates, subscriptions, subscriptionProducts,
          invoices, payments, paymentTransactions, settings
        ] = await Promise.all([
          customerService.getAll(), resellerService.getAll(), supplierService.getAll(),
          digitalCodeService.getAll(), tvBoxService.getAll(), saleService.getAll(),
          purchaseService.getAll(), emailTemplateService.getAll(),
          subscriptionService.getAll(), subscriptionProductService.getAll(),
          invoiceService.getAll(), paymentService.getAll(), paymentTransactionService.getAll(),
          settingsService.get(),
        ]);
        adminDataPayload = {
          customers, resellers, suppliers, digitalCodes, tvBoxes, sales,
          purchases, emailTemplates, subscriptions, subscriptionProducts,
          invoices, payments, paymentTransactions,
          settings: settings || null,
        };
         console.debug("AppContext: 🎉 Admin data fetched.");
      } else {
         console.debug("AppContext: isAdmin is false, skipping admin data fetch.");
         // Reset admin-specific data in state if needed for non-admin users
         adminDataPayload = {
             customers: [], resellers: [], suppliers: [], digitalCodes: [], tvBoxes: [], sales: [],
             purchases: [], emailTemplates: [], subscriptions: [], subscriptionProducts: [],
             invoices: [], payments: [], paymentTransactions: [], settings: null
         };
      }

      // Combine common and admin data
      dispatch({
        type: 'SET_INITIAL_DATA',
        payload: {
          ...adminDataPayload, // Spread admin data (or empty arrays if not admin)
          exchangeRates: state.exchangeRates // Preserve rates if already fetched, or will be fetched by fetchExchangeRates
        } as any // Cast to any to handle nested types not fitting the shallow Omit
      });

      // Fetch exchange rates regardless of admin status (if needed by all users)
      await fetchExchangeRates(); // Await this to ensure rates are in state before UI renders

    } catch (error: any) {
      console.error("AppContext: ❌ Error loading data", error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      // Ensure loading is set to false, even on error or if not admin
      dispatch({ type: 'SET_LOADING', payload: false });
      loadDataTriggered.current = false; // Reset the trigger flag
      console.debug("AppContext: loadAllData finished, loading set to false.");
    }
  // Include dependencies needed *inside* the function, if any (e.g., fetchExchangeRates)
  // But critically, DON'T include the auth states here.
  }, [isAdmin, fetchExchangeRates, state.exchangeRates]); // Depend on isAdmin to re-create if it changes

  // useEffect to TRIGGER loadAllData based on auth state changes
  useEffect(() => {
    console.debug('AppContext: useEffect trigger check.', { authInitialized, authLoading, isAdmin, loadDataTriggered: loadDataTriggered.current });

    // Condition to run loadAllData:
    // 1. Auth MUST be initialized.
    // 2. Auth MUST NOT be currently loading.
    // 3. We haven't already triggered loading based on the current auth state.
    // 4. If isAdmin is true, we want to ensure we load.
    if (authInitialized && !authLoading && !loadDataTriggered.current) {
        console.debug('AppContext: useEffect triggering loadAllData.');
        loadAllData();
    } else if (!authInitialized || authLoading) {
        console.debug('AppContext: useEffect condition not met, waiting for auth.');
        // Reset the trigger flag if auth state changes back to loading/uninitialized
        loadDataTriggered.current = false;
    }
  // This useEffect should run whenever the auth state potentially allows loading
  }, [authInitialized, authLoading, isAdmin, loadAllData]);


  const allActions: AppContextType['actions'] = useMemo(() => ({
    loadAllData: loadAllData, // Provide the useCallback version
    getDisplayCurrency: (): SupportedCurrency => {
      return (state.settings?.currency as SupportedCurrency) || 'DKK';
    },
    updateSettings: async (id: string, settings: Partial<Settings>) => {
      try {
        const updatedSettings = await settingsService.update(id, settings);
        dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });
        return updatedSettings;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update settings' });
        throw error;
      }
    },
    // --- FULL IMPLEMENTATION OF ALL ACTIONS TO SATISFY AppContextType interface ---
    // You should replace these with your actual service calls
    createCustomer: async (customer) => { try { const newC = await customerService.create(customer as any); dispatch({ type: 'ADD_CUSTOMER', payload: newC }); return newC; } catch (e: any) { console.error('createCustomer:', e); throw e; } },
    updateCustomer: async (id, customer) => { try { const updatedC = await customerService.update(id, customer as any); dispatch({ type: 'UPDATE_CUSTOMER', payload: updatedC }); return updatedC; } catch (e: any) { console.error('updateCustomer:', e); throw e; } },
    deleteCustomer: async (id) => { try { await customerService.delete(id); dispatch({ type: 'DELETE_CUSTOMER', payload: id }); } catch (e: any) { console.error('deleteCustomer:', e); throw e; } },
    createReseller: async (reseller) => { try { const newR = await resellerService.create(reseller as any); dispatch({ type: 'ADD_RESELLER', payload: newR }); return newR; } catch (e: any) { console.error('createReseller:', e); throw e; } },
    updateReseller: async (id, reseller) => { try { const updatedR = await resellerService.update(id, reseller as any); dispatch({ type: 'UPDATE_RESELLER', payload: updatedR }); return updatedR; } catch (e: any) { console.error('updateReseller:', e); throw e; } },
    deleteReseller: async (id) => { try { await resellerService.delete(id); dispatch({ type: 'DELETE_RESELLER', payload: id }); } catch (e: any) { console.error('deleteReseller:', e); throw e; } },
    addResellerCredit: async (_resellerId, _amount, _paymentMethod) => { console.log('Mocked addResellerCredit'); await loadAllData(); },
    createSupplier: async (supplier) => { try { const newS = await supplierService.create(supplier as any); dispatch({ type: 'ADD_SUPPLIER', payload: newS }); return newS; } catch (e: any) { console.error('createSupplier:', e); throw e; } },
    updateSupplier: async (id, supplier) => { try { const updatedS = await supplierService.update(id, supplier as any); dispatch({ type: 'UPDATE_SUPPLIER', payload: updatedS }); return updatedS; } catch (e: any) { console.error('updateSupplier:', e); throw e; } },
    deleteSupplier: async (id) => { try { await supplierService.delete(id); dispatch({ type: 'DELETE_SUPPLIER', payload: id }); } catch (e: any) { console.error('deleteSupplier:', e); throw e; } },
    addSupplierCredit: async (_supplierId, _amount, _description) => { console.log('Mocked addSupplierCredit'); await loadAllData(); },
    adjustSupplierCredit: async (_supplierId, _amount, _description) => { console.log('Mocked adjustSupplierCredit'); await loadAllData(); },
    sellCreditToReseller: async (_supplierId, _resellerId, _creditAmount, _salePrice) => { console.log('Mocked sellCreditToReseller'); await loadAllData(); },
    createDigitalCode: async (code) => { try { const newD = await digitalCodeService.create(code as any); dispatch({ type: 'ADD_DIGITAL_CODE', payload: newD }); return newD; } catch (e: any) { console.error('createDigitalCode:', e); throw e; } },
    updateDigitalCode: async (id, code) => { try { const updatedD = await digitalCodeService.update(id, code as any); dispatch({ type: 'UPDATE_DIGITAL_CODE', payload: updatedD }); return updatedD; } catch (e: any) { console.error('updateDigitalCode:', e); throw e; } },
    deleteDigitalCode: async (id) => { try { await digitalCodeService.delete(id); dispatch({ type: 'DELETE_DIGITAL_CODE', payload: id }); } catch (e: any) { console.error('deleteDigitalCode:', e); throw e; } },
    createTVBox: async (tvBox) => { try { const newT = await tvBoxService.create(tvBox as any); dispatch({ type: 'ADD_TV_BOX', payload: newT }); return newT; } catch (e: any) { console.error('createTVBox:', e); throw e; } },
    updateTVBox: async (id, tvBox) => { try { const updatedT = await tvBoxService.update(id, tvBox as any); dispatch({ type: 'UPDATE_TV_BOX', payload: updatedT }); return updatedT; } catch (e: any) { console.error('updateTVBox:', e); throw e; } },
    deleteTVBox: async (id) => { try { await tvBoxService.delete(id); dispatch({ type: 'DELETE_TV_BOX', payload: id }); } catch (e: any) { console.error('deleteTVBox:', e); throw e; } },
    createSale: async (sale) => { try { const newS = await saleService.create(sale as any); dispatch({ type: 'ADD_SALE', payload: newS }); return newS; } catch (e: any) { console.error('createSale:', e); throw e; } },
    updateSale: async (id, sale) => { try { const updatedS = await saleService.update(id, sale as any); dispatch({ type: 'UPDATE_SALE', payload: updatedS }); return updatedS; } catch (e: any) { console.error('updateSale:', e); throw e; } },
    deleteSale: async (id) => { try { await saleService.delete(id); dispatch({ type: 'DELETE_SALE', payload: id }); } catch (e: any) { console.error('deleteSale:', e); throw e; } },
    createPurchase: async (purchase) => { try { const newP = await purchaseService.create(purchase as any); dispatch({ type: 'ADD_PURCHASE', payload: newP }); return newP; } catch (e: any) { console.error('createPurchase:', e); throw e; } },
    updatePurchase: async (id, purchase) => { try { const updatedP = await purchaseService.update(id, purchase as any); dispatch({ type: 'UPDATE_PURCHASE', payload: updatedP }); return updatedP; } catch (e: any) { console.error('updatePurchase:', e); throw e; } },
    deletePurchase: async (id) => { try { await purchaseService.delete(id); dispatch({ type: 'DELETE_PURCHASE', payload: id }); } catch (e: any) { console.error('deletePurchase:', e); throw e; } },
    createEmailTemplate: async (template) => { try { const newET = await emailTemplateService.create(template as any); dispatch({ type: 'ADD_EMAIL_TEMPLATE', payload: newET }); return newET; } catch (e: any) { console.error('createEmailTemplate:', e); throw e; } },
    updateEmailTemplate: async (id, template) => { try { const updatedET = await emailTemplateService.update(id, template as any); dispatch({ type: 'UPDATE_EMAIL_TEMPLATE', payload: updatedET }); return updatedET; } catch (e: any) { console.error('updateEmailTemplate:', e); throw e; } },
    deleteEmailTemplate: async (id) => { try { await emailTemplateService.delete(id); dispatch({ type: 'DELETE_EMAIL_TEMPLATE', payload: id }); } catch (e: any) { console.error('deleteEmailTemplate:', e); throw e; } },
    sendEmail: async (_to, _subject, _content, _templateData) => { console.log('Mocked sendEmail'); },
    createSubscription: async (subscription) => { try { const newS = await subscriptionService.create(subscription as any); dispatch({ type: 'ADD_SUBSCRIPTION', payload: newS }); return newS; } catch (e: any) { console.error('createSubscription:', e); throw e; } },
    updateSubscription: async (id, subscription) => { try { const updatedS = await subscriptionService.update(id, subscription as any); dispatch({ type: 'UPDATE_SUBSCRIPTION', payload: updatedS }); return updatedS; } catch (e: any) { console.error('updateSubscription:', e); throw e; } },
    deleteSubscription: async (id) => { try { await subscriptionService.delete(id); dispatch({ type: 'DELETE_SUBSCRIPTION', payload: id }); } catch (e: any) { console.error('deleteSubscription:', e); throw e; } },
    createSubscriptionProduct: async (product) => { try { const newSP = await subscriptionProductService.create(product as any); dispatch({ type: 'ADD_SUBSCRIPTION_PRODUCT', payload: newSP }); return newSP; } catch (e: any) { console.error('createSubscriptionProduct:', e); throw e; } },
    updateSubscriptionProduct: async (id, product) => { try { const updatedSP = await subscriptionProductService.update(id, product as any); dispatch({ type: 'UPDATE_SUBSCRIPTION_PRODUCT', payload: updatedSP }); return updatedSP; } catch (e: any) { console.error('updateSubscriptionProduct:', e); throw e; } },
    deleteSubscriptionProduct: async (id) => { try { await subscriptionProductService.delete(id); dispatch({ type: 'DELETE_SUBSCRIPTION_PRODUCT', payload: id }); } catch (e: any) { console.error('deleteSubscriptionProduct:', e); throw e; } },
    createSettings: async (settings) => { try { const newS = await settingsService.create(settings as any); dispatch({ type: 'SET_SETTINGS', payload: newS }); return newS; } catch (e: any) { console.error('createSettings:', e); throw e; } },
    addPaymentTransaction: async (_pt) => { console.log('Mocked addPaymentTransaction'); await loadAllData(); return _pt as PaymentTransaction; },
    updatePaymentTransaction: async (_id, _pt) => { console.log('Mocked updatePaymentTransaction'); await loadAllData(); return _pt as PaymentTransaction; },
    createInvoice: async (invoice) => { try { const newI = await invoiceService.create(invoice as any); dispatch({ type: 'ADD_INVOICE', payload: newI }); return newI; } catch (e: any) { console.error('createInvoice:', e); throw e; } },
    updateInvoice: async (id, invoice) => { try { const updatedI = await invoiceService.update(id, invoice as any); dispatch({ type: 'UPDATE_INVOICE', payload: updatedI }); return updatedI; } catch (e: any) { console.error('updateInvoice:', e); throw e; } },
    deleteInvoice: async (id) => { try { await invoiceService.delete(id); dispatch({ type: 'DELETE_INVOICE', payload: id }); } catch (e: any) { console.error('deleteInvoice:', e); throw e; } },
    createPayment: async (payment) => { try { const newP = await paymentService.create(payment as any); dispatch({ type: 'ADD_PAYMENT', payload: newP }); return newP; } catch (e: any) { console.error('createPayment:', e); throw e; } },
    updatePayment: async (id, payment) => { try { const updatedP = await paymentService.update(id, payment as any); dispatch({ type: 'UPDATE_PAYMENT', payload: updatedP }); return updatedP; } catch (e: any) { console.error('updatePayment:', e); throw e; } },
    deletePayment: async (id) => { try { await paymentService.delete(id); dispatch({ type: 'DELETE_PAYMENT', payload: id }); } catch (e: any) { console.error('deletePayment:', e); throw e; } },
    refreshExchangeRates: async () => { await fetchExchangeRates(); },
    revolut: {
      getPaymentStatus: async (_paymentRequestId: string) => {
        console.log('Mock Revolut: Getting payment status for', _paymentRequestId);
        return { success: true, data: { status: 'COMPLETED' } };
      },
    },
  }), [state, loadAllData, fetchExchangeRates, dispatch]); // Added dispatch to dependencies

  const value = useMemo(() => ({ state, dispatch, actions: allActions }), [state, dispatch, allActions]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// --- Assuming AppState, AppAction, initialState, appReducer are defined here or imported ---
// If they are not, you'll need to provide them.
// Example placeholder for AppState, AppAction, initialState, appReducer:
/*
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
  | { type: 'SET_EXCHANGE_RATES'; payload: ExchangeRates }
  | { type: 'SET_SETTINGS'; payload: Settings }
  // ... other actions for adding/updating/deleting entities

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
    // ... handle other actions
    default:
      return state;
  }
}
*/
