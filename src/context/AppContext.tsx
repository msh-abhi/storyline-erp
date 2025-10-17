import React, { createContext, useContext, useReducer, useEffect, useMemo, ReactNode, Dispatch, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import {
  Customer, Reseller, Supplier, DigitalCode, TVBox, Sale, Purchase,
  Subscription, SubscriptionProduct, EmailTemplate, Invoice, Payment,
  PaymentTransaction, Settings, ExchangeRates, SupportedCurrency
} from '../types';
import {
  customerService, resellerService, supplierService, digitalCodeService,
  tvBoxService, saleService, purchaseService, subscriptionService,
  invoiceService, paymentService, settingsService,
  paymentTransactionService, emailTemplateService, subscriptionProductService
  // Temporarily comment out exchangeRateService import
  // exchangeRateService
} from '../services/supabaseService';

// Define State and Action types
interface AppState {
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
  subscriptionProducts: SubscriptionProduct[];
  emailTemplates: EmailTemplate[];
  invoices: Invoice[];
  payments: Payment[];
  paymentTransactions: PaymentTransaction[];
  settings: Settings | null;
  exchangeRates: ExchangeRates | null;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INITIAL_DATA'; payload: Omit<AppState, 'loading' | 'error'> }
  | { type: 'SET_CUSTOMERS'; payload: Customer[] }
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'DELETE_CUSTOMER'; payload: string }
  | { type: 'SET_RESELLERS'; payload: Reseller[] }
  | { type: 'ADD_RESELLER'; payload: Reseller }
  | { type: 'UPDATE_RESELLER'; payload: Reseller }
  | { type: 'DELETE_RESELLER'; payload: string }
  | { type: 'SET_SUPPLIERS'; payload: Supplier[] }
  | { type: 'ADD_SUPPLIER'; payload: Supplier }
  | { type: 'UPDATE_SUPPLIER'; payload: Supplier }
  | { type: 'DELETE_SUPPLIER'; payload: string }
  | { type: 'SET_DIGITAL_CODES'; payload: DigitalCode[] }
  | { type: 'ADD_DIGITAL_CODE'; payload: DigitalCode }
  | { type: 'UPDATE_DIGITAL_CODE'; payload: DigitalCode }
  | { type: 'DELETE_DIGITAL_CODE'; payload: string }
  | { type: 'SET_TV_BOXES'; payload: TVBox[] }
  | { type: 'ADD_TV_BOX'; payload: TVBox }
  | { type: 'UPDATE_TV_BOX'; payload: TVBox }
  | { type: 'DELETE_TV_BOX'; payload: string }
  | { type: 'SET_SALES'; payload: Sale[] }
  | { type: 'ADD_SALE'; payload: Sale }
  | { type: 'UPDATE_SALE'; payload: Sale }
  | { type: 'DELETE_SALE'; payload: string }
  | { type: 'SET_PURCHASES'; payload: Purchase[] }
  | { type: 'ADD_PURCHASE'; payload: Purchase }
  | { type: 'UPDATE_PURCHASE'; payload: Purchase }
  | { type: 'DELETE_PURCHASE'; payload: string }
  | { type: 'SET_SUBSCRIPTIONS'; payload: Subscription[] }
  | { type: 'ADD_SUBSCRIPTION'; payload: Subscription }
  | { type: 'UPDATE_SUBSCRIPTION'; payload: Subscription }
  | { type: 'DELETE_SUBSCRIPTION'; payload: string }
  | { type: 'SET_SUBSCRIPTION_PRODUCTS'; payload: SubscriptionProduct[] }
  | { type: 'ADD_SUBSCRIPTION_PRODUCT'; payload: SubscriptionProduct }
  | { type: 'UPDATE_SUBSCRIPTION_PRODUCT'; payload: SubscriptionProduct }
  | { type: 'DELETE_SUBSCRIPTION_PRODUCT'; payload: string }
  | { type: 'SET_EMAIL_TEMPLATES'; payload: EmailTemplate[] }
  | { type: 'ADD_EMAIL_TEMPLATE'; payload: EmailTemplate }
  | { type: 'UPDATE_EMAIL_TEMPLATE'; payload: EmailTemplate }
  | { type: 'DELETE_EMAIL_TEMPLATE'; payload: string }
  | { type: 'SET_INVOICES'; payload: Invoice[] }
  | { type: 'ADD_INVOICE'; payload: Invoice }
  | { type: 'UPDATE_INVOICE'; payload: Invoice }
  | { type: 'DELETE_INVOICE'; payload: string }
  | { type: 'SET_PAYMENTS'; payload: Payment[] }
  | { type: 'ADD_PAYMENT'; payload: Payment }
  | { type: 'UPDATE_PAYMENT'; payload: Payment }
  | { type: 'DELETE_PAYMENT'; payload: string }
  | { type: 'SET_PAYMENT_TRANSACTIONS'; payload: PaymentTransaction[] }
  | { type: 'ADD_PAYMENT_TRANSACTION'; payload: PaymentTransaction }
  | { type: 'UPDATE_PAYMENT_TRANSACTION'; payload: PaymentTransaction }
  | { type: 'DELETE_PAYMENT_TRANSACTION'; payload: string }
  | { type: 'SET_SETTINGS'; payload: Settings | null }
  | { type: 'SET_EXCHANGE_RATES'; payload: ExchangeRates | null };

const initialState: AppState = {
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
  subscriptionProducts: [],
  emailTemplates: [],
  invoices: [],
  payments: [],
  paymentTransactions: [],
  settings: null,
  exchangeRates: null,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_INITIAL_DATA':
      return { ...state, ...action.payload, loading: false, error: null };
    case 'SET_CUSTOMERS':
      return { ...state, customers: action.payload };
    case 'ADD_CUSTOMER':
      return { ...state, customers: [...state.customers, action.payload] };
    case 'UPDATE_CUSTOMER':
      return { ...state, customers: state.customers.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CUSTOMER':
      return { ...state, customers: state.customers.filter(c => c.id !== action.payload) };
    case 'SET_RESELLERS':
      return { ...state, resellers: action.payload };
    case 'ADD_RESELLER':
      return { ...state, resellers: [...state.resellers, action.payload] };
    case 'UPDATE_RESELLER':
      return { ...state, resellers: state.resellers.map(r => r.id === action.payload.id ? action.payload : r) };
    case 'DELETE_RESELLER':
      return { ...state, resellers: state.resellers.filter(r => r.id !== action.payload) };
    case 'SET_SUPPLIERS':
      return { ...state, suppliers: action.payload };
    case 'ADD_SUPPLIER':
      return { ...state, suppliers: [...state.suppliers, action.payload] };
    case 'UPDATE_SUPPLIER':
      return { ...state, suppliers: state.suppliers.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SUPPLIER':
      return { ...state, suppliers: state.suppliers.filter(s => s.id !== action.payload) };
    case 'SET_DIGITAL_CODES':
      return { ...state, digitalCodes: action.payload };
    case 'ADD_DIGITAL_CODE':
      return { ...state, digitalCodes: [...state.digitalCodes, action.payload] };
    case 'UPDATE_DIGITAL_CODE':
      return { ...state, digitalCodes: state.digitalCodes.map(d => d.id === action.payload.id ? action.payload : d) };
    case 'DELETE_DIGITAL_CODE':
      return { ...state, digitalCodes: state.digitalCodes.filter(d => d.id !== action.payload) };
    case 'SET_TV_BOXES':
      return { ...state, tvBoxes: action.payload };
    case 'ADD_TV_BOX':
      return { ...state, tvBoxes: [...state.tvBoxes, action.payload] };
    case 'UPDATE_TV_BOX':
      return { ...state, tvBoxes: state.tvBoxes.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TV_BOX':
      return { ...state, tvBoxes: state.tvBoxes.filter(t => t.id !== action.payload) };
    case 'SET_SALES':
      return { ...state, sales: action.payload };
    case 'ADD_SALE':
      return { ...state, sales: [...state.sales, action.payload] };
    case 'UPDATE_SALE':
      return { ...state, sales: state.sales.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SALE':
      return { ...state, sales: state.sales.filter(s => s.id !== action.payload) };
    case 'SET_PURCHASES':
      return { ...state, purchases: action.payload };
    case 'ADD_PURCHASE':
      return { ...state, purchases: [...state.purchases, action.payload] };
    case 'UPDATE_PURCHASE':
      return { ...state, purchases: state.purchases.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PURCHASE':
      return { ...state, purchases: state.purchases.filter(p => p.id !== action.payload) };
    case 'SET_SUBSCRIPTIONS':
      return { ...state, subscriptions: action.payload };
    case 'ADD_SUBSCRIPTION':
      return { ...state, subscriptions: [...state.subscriptions, action.payload] };
    case 'UPDATE_SUBSCRIPTION':
      return { ...state, subscriptions: state.subscriptions.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SUBSCRIPTION':
      return { ...state, subscriptions: state.subscriptions.filter(s => s.id !== action.payload) };
    case 'SET_SUBSCRIPTION_PRODUCTS':
      return { ...state, subscriptionProducts: action.payload };
    case 'ADD_SUBSCRIPTION_PRODUCT':
      return { ...state, subscriptionProducts: [...state.subscriptionProducts, action.payload] };
    case 'UPDATE_SUBSCRIPTION_PRODUCT':
      return { ...state, subscriptionProducts: state.subscriptionProducts.map(sp => sp.id === action.payload.id ? action.payload : sp) };
    case 'DELETE_SUBSCRIPTION_PRODUCT':
      return { ...state, subscriptionProducts: state.subscriptionProducts.filter(sp => sp.id !== action.payload) };
    case 'SET_EMAIL_TEMPLATES':
      return { ...state, emailTemplates: action.payload };
    case 'ADD_EMAIL_TEMPLATE':
      return { ...state, emailTemplates: [...state.emailTemplates, action.payload] };
    case 'UPDATE_EMAIL_TEMPLATE':
      return { ...state, emailTemplates: state.emailTemplates.map(et => et.id === action.payload.id ? action.payload : et) };
    case 'DELETE_EMAIL_TEMPLATE':
      return { ...state, emailTemplates: state.emailTemplates.filter(et => et.id !== action.payload) };
    case 'SET_INVOICES':
      return { ...state, invoices: action.payload };
    case 'ADD_INVOICE':
      return { ...state, invoices: [...state.invoices, action.payload] };
    case 'UPDATE_INVOICE':
      return { ...state, invoices: state.invoices.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'DELETE_INVOICE':
      return { ...state, invoices: state.invoices.filter(i => i.id !== action.payload) };
    case 'SET_PAYMENTS':
      return { ...state, payments: action.payload };
    case 'ADD_PAYMENT':
      return { ...state, payments: [...state.payments, action.payload] };
    case 'UPDATE_PAYMENT':
      return { ...state, payments: state.payments.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PAYMENT':
      return { ...state, payments: state.payments.filter(p => p.id !== action.payload) };
    case 'SET_PAYMENT_TRANSACTIONS':
      return { ...state, paymentTransactions: action.payload };
    case 'ADD_PAYMENT_TRANSACTION':
      return { ...state, paymentTransactions: [...state.paymentTransactions, action.payload] };
    case 'UPDATE_PAYMENT_TRANSACTION':
      return { ...state, paymentTransactions: state.paymentTransactions.map(pt => pt.id === action.payload.id ? action.payload : pt) };
    case 'DELETE_PAYMENT_TRANSACTION':
      return { ...state, paymentTransactions: state.paymentTransactions.filter(pt => pt.id !== action.payload) };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_EXCHANGE_RATES':
      return { ...state, exchangeRates: action.payload };
    default:
      return state;
  }
};

interface AppContextType {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  actions: {
    loadAllData: () => Promise<void>;
    // Temporarily comment out refreshExchangeRates
    // refreshExchangeRates: () => Promise<void>;
    getDisplayCurrency: () => SupportedCurrency;
    updateSettings: (id: string, settings: Partial<Settings>) => Promise<void>;
    // Customer actions
    createCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
    deleteCustomer: (id: string) => Promise<void>;
    // Reseller actions
    createReseller: (reseller: Omit<Reseller, 'id' | 'createdAt' | 'updatedAt' | 'paymentHistory'>) => Promise<void>;
    updateReseller: (id: string, reseller: Partial<Reseller>) => Promise<void>;
    deleteReseller: (id: string) => Promise<void>;
    addResellerCredit: (resellerId: string, amount: number, paymentMethod: string) => Promise<void>;
    // Supplier actions
    createSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'paymentHistory'>) => Promise<void>;
    updateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<void>;
    deleteSupplier: (id: string) => Promise<void>;
    addSupplierCredit: (supplierId: string, amount: number, description: string) => Promise<void>;
    adjustSupplierCredit: (supplierId: string, amount: number, description: string) => Promise<void>;
    sellCreditToReseller: (supplierId: string, resellerId: string, creditAmount: number, salePrice: number) => Promise<void>;
    // Digital Code actions
    createDigitalCode: (code: Omit<DigitalCode, 'id' | 'createdAt' | 'updatedAt' | 'soldQuantity'>) => Promise<void>;
    updateDigitalCode: (id: string, code: Partial<DigitalCode>) => Promise<void>;
    deleteDigitalCode: (id: string) => Promise<void>;
    // TV Box actions
    createTVBox: (tvBox: Omit<TVBox, 'id' | 'createdAt' | 'updatedAt' | 'soldQuantity'>) => Promise<void>;
    updateTVBox: (id: string, tvBox: Partial<TVBox>) => Promise<void>;
    deleteTVBox: (id: string) => Promise<void>;
    // Sale actions
    createSale: (sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'saleDate'>) => Promise<void>;
    updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
    deleteSale: (id: string) => Promise<void>;
    // Purchase actions
    createPurchase: (purchase: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'purchaseDate'>) => Promise<void>;
    updatePurchase: (id: string, purchase: Partial<Purchase>) => Promise<void>;
    deletePurchase: (id: string) => Promise<void>;
    // Email Template actions
    createEmailTemplate: (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateEmailTemplate: (id: string, template: Partial<EmailTemplate>) => Promise<void>;
    deleteEmailTemplate: (id: string) => Promise<void>;
    sendEmail: (to: string, subject: string, content: string, templateData?: Record<string, string>) => Promise<void>;
    // Subscription actions
    createSubscription: (subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateSubscription: (id: string, subscription: Partial<Subscription>) => Promise<void>;
    deleteSubscription: (id: string) => Promise<void>;
    // Subscription Product actions
    createSubscriptionProduct: (product: Omit<SubscriptionProduct, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateSubscriptionProduct: (id: string, product: Partial<SubscriptionProduct>) => Promise<void>;
    deleteSubscriptionProduct: (id: string) => Promise<void>;
    // Settings actions
    createSettings: (settings: Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateSettings: (id: string, settings: Partial<Settings>) => Promise<void>;
  };
}

// THIS LINE IS CRUCIAL AND WAS LIKELY MISPLACED OR MISSING
const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { isAdmin, loading: authLoading } = useAuth();

  // --- NEW LOG HERE ---
  console.log('AppContext: AppProvider rendering. authLoading:', authLoading, 'isAdmin:', isAdmin);
  // --- END NEW LOG ---

  // Make loadAllData a useCallback directly to ensure it captures latest authLoading/isAdmin
  const loadAllData = useCallback(async () => {
    console.log('AppContext: DEBUG: loadAllData (useCallback) called. authLoading:', authLoading, 'isAdmin:', isAdmin);

    if (authLoading || !isAdmin) {
      console.log('AppContext: DEBUG: loadAllData (useCallback) returning early. authLoading:', authLoading, 'isAdmin:', isAdmin);
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }
    console.log("AppContext: Admin detected, loading all ERP data...");
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
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

      dispatch({
        type: 'SET_INITIAL_DATA',
        payload: {
          customers, resellers, suppliers, digitalCodes, tvBoxes, sales,
          purchases, emailTemplates, subscriptions, subscriptionProducts,
          invoices, payments, paymentTransactions,
          settings: settings || null,
          exchangeRates: null
        }
      });
      console.log("AppContext: ERP data loaded successfully.");
    } catch (error: any) {
      console.error("AppContext: Error loading initial data", error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      // Loading state is set by SET_INITIAL_DATA, no need for a separate finally block here
    }
  }, [authLoading, isAdmin]); // Dependencies for useCallback

  const actions = useMemo(() => ({
    loadAllData: loadAllData, // Reference the useCallback version
    getDisplayCurrency: (): SupportedCurrency => {
      return (state.settings?.currency as SupportedCurrency) || 'DKK';
    },
    updateSettings: async (id: string, settings: Partial<Settings>) => {
      try {
        const updatedSettings = await settingsService.update(id, settings);
        dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update settings' });
        throw error;
      }
    }
  }), [loadAllData, state.settings]); // actions depends on loadAllData and state.settings

  useEffect(() => {
    console.log('AppContext: useEffect triggered. Current authLoading:', authLoading, 'isAdmin:', isAdmin);
    loadAllData(); // Call loadAllData directly
  }, [loadAllData, authLoading, isAdmin]); // useEffect depends on loadAllData, authLoading, isAdmin

  const value = useMemo(() => ({ state, dispatch, actions }), [state, actions]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
