import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  Dispatch,
  useCallback,
  useRef
} from 'react';
import { useAuth } from '../components/AuthProvider';
import {
  customerService, resellerService, supplierService, digitalCodeService,
  tvBoxService, saleService, purchaseService, subscriptionService,
  invoiceService, paymentService, settingsService, exchangeRateService,
  paymentTransactionService, emailTemplateService, subscriptionProductService,
} from '../services/supabaseService';
import {
  AppState, AppAction, initialState, appReducer,
  Customer, Reseller, Supplier, DigitalCode, TVBox, Sale, Purchase,
  Subscription, Invoice, PaymentTransaction, EmailTemplate, SubscriptionProduct,
  ExchangeRates, SupportedCurrency, Settings, Payment
} from '../types';

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

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { authLoading, authInitialized, isAdmin, authUser } = useAuth();
  const loadDataTriggered = useRef(false);

  const handleErrors = (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    dispatch({ type: 'SET_ERROR', payload: errorMessage });
    console.error(errorMessage);
  };

  const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(fn: T) => {
    return async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        handleErrors(error);
        return undefined;
      }
    };
  };

  const fetchExchangeRates = useCallback(withErrorHandling(async () => {
    const rates = await exchangeRateService.getLatest();
    if (rates) {
        dispatch({ type: 'SET_EXCHANGE_RATES', payload: rates });
    } else {
        dispatch({ type: 'SET_EXCHANGE_RATES', payload: null });
    }
  }), []);

  const loadAllData = useCallback(withErrorHandling(async () => {
    if (loadDataTriggered.current || !authUser) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    loadDataTriggered.current = true;

    let dataPayload: Partial<AppState> = {};
      
    if (isAdmin) {
      await fetchExchangeRates();
        
      const [
        customers, resellers, suppliers, digitalCodes, tvBoxes, sales,
        purchases, emailTemplates, subscriptions, subscriptionProducts,
        invoices, payments, paymentTransactions, settings
      ] = await Promise.all([
        customerService.getAll(),
        resellerService.getAll(),
        supplierService.getAll(),
        digitalCodeService.getAll(),
        tvBoxService.getAll(),
        saleService.getAll(),
        purchaseService.getAll(),
        emailTemplateService.getAll(),
        subscriptionService.getAll(),
        subscriptionProductService.getAll(),
        invoiceService.getAll(),
        paymentService.getAll(),
        paymentTransactionService.getAll(),
        settingsService.get(),
      ]);
        
      dataPayload = {
        customers: customers,
        resellers: resellers,
        suppliers: suppliers,
        digitalCodes: digitalCodes,
        tvBoxes: tvBoxes,
        sales: sales,
        purchases: purchases,
        emailTemplates: emailTemplates,
        subscriptions: subscriptions,
        subscriptionProducts: subscriptionProducts,
        invoices: invoices,
        payments: payments,
        paymentTransactions: paymentTransactions,
        settings: settings || null,
      };
    } else {
      await fetchExchangeRates();
      dataPayload = {
        customers: [], resellers: [], suppliers: [], digitalCodes: [], tvBoxes: [], sales: [],
        purchases: [], emailTemplates: [], subscriptions: [], subscriptionProducts: [],
        invoices: [], payments: [], paymentTransactions: [], settings: null
      };
    }

    dispatch({
      type: 'SET_INITIAL_DATA',
      payload: dataPayload as any
    });

    dispatch({ type: 'SET_LOADING', payload: false });
    loadDataTriggered.current = false;
  }), [isAdmin, authUser, fetchExchangeRates]);

  useEffect(() => {
    if (authInitialized && !authLoading && !loadDataTriggered.current && authUser) {
        loadAllData();
    } else {
        if (!authInitialized || authLoading) {
          loadDataTriggered.current = false;
        }
    }
  }, [authInitialized, authLoading, isAdmin, authUser, loadAllData]);


  const allActions: AppContextType['actions'] = useMemo(() => ({
    loadAllData: withErrorHandling(loadAllData),
    getDisplayCurrency: (): SupportedCurrency => {
      return (state.settings?.currency as SupportedCurrency) || 'DKK';
    },
    updateSettings: withErrorHandling(async (id: string, settings: Partial<Settings>) => {
      const updatedSettings = await settingsService.update(id, settings);
      dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });
      return updatedSettings;
    }),
    createCustomer: withErrorHandling(async (customer) => { const newC = await customerService.create(customer as any); dispatch({ type: 'ADD_CUSTOMER', payload: newC }); return newC; }),
    updateCustomer: withErrorHandling(async (id, customer) => { const updatedC = await customerService.update(id, customer as any); dispatch({ type: 'UPDATE_CUSTOMER', payload: updatedC }); return updatedC; }),
    deleteCustomer: withErrorHandling(async (id) => { await customerService.delete(id); dispatch({ type: 'DELETE_CUSTOMER', payload: id }); }),
    createReseller: withErrorHandling(async (reseller) => { const newR = await resellerService.create(reseller as any); dispatch({ type: 'ADD_RESELLER', payload: newR }); return newR; }),
    updateReseller: withErrorHandling(async (id, reseller) => { const updatedR = await resellerService.update(id, reseller as any); dispatch({ type: 'UPDATE_RESELLER', payload: updatedR }); return updatedR; }),
    deleteReseller: withErrorHandling(async (id) => { await resellerService.delete(id); dispatch({ type: 'DELETE_RESELLER', payload: id }); }),
    addResellerCredit: withErrorHandling(async (_resellerId, _amount, _paymentMethod) => { console.log('Mocked addResellerCredit'); await loadAllData(); }),
    createSupplier: withErrorHandling(async (supplier) => { const newS = await supplierService.create(supplier as any); dispatch({ type: 'ADD_SUPPLIER', payload: newS }); return newS; }),
    updateSupplier: withErrorHandling(async (id, supplier) => { const updatedS = await supplierService.update(id, supplier as any); dispatch({ type: 'UPDATE_SUPPLIER', payload: updatedS }); return updatedS; }),
    deleteSupplier: withErrorHandling(async (id) => { await supplierService.delete(id); dispatch({ type: 'DELETE_SUPPLIER', payload: id }); }),
    addSupplierCredit: withErrorHandling(async (_supplierId, _amount, _description) => { console.log('Mocked addSupplierCredit'); await loadAllData(); }),
    adjustSupplierCredit: withErrorHandling(async (_supplierId, _amount, _description) => { console.log('Mocked adjustSupplierCredit'); await loadAllData(); }),
    sellCreditToReseller: withErrorHandling(async (_supplierId, _resellerId, _creditAmount, _salePrice) => { console.log('Mocked sellCreditToReseller'); await loadAllData(); }),
    createDigitalCode: withErrorHandling(async (code) => { const newD = await digitalCodeService.create(code as any); dispatch({ type: 'ADD_DIGITAL_CODE', payload: newD }); return newD; }),
    updateDigitalCode: withErrorHandling(async (id, code) => { const updatedD = await digitalCodeService.update(id, code as any); dispatch({ type: 'UPDATE_DIGITAL_CODE', payload: updatedD }); return updatedD; }),
    deleteDigitalCode: withErrorHandling(async (id) => { await digitalCodeService.delete(id); dispatch({ type: 'DELETE_DIGITAL_CODE', payload: id }); }),
    createTVBox: withErrorHandling(async (tvBox) => { const newT = await tvBoxService.create(tvBox as any); dispatch({ type: 'ADD_TV_BOX', payload: newT }); return newT; }),
    updateTVBox: withErrorHandling(async (id, tvBox) => { const updatedT = await tvBoxService.update(id, tvBox as any); dispatch({ type: 'UPDATE_TV_BOX', payload: updatedT }); return updatedT; }),
    deleteTVBox: withErrorHandling(async (id) => { await tvBoxService.delete(id); dispatch({ type: 'DELETE_TV_BOX', payload: id }); }),
    createSale: withErrorHandling(async (sale) => { const newS = await saleService.create(sale as any); dispatch({ type: 'ADD_SALE', payload: newS }); return newS; }),
    updateSale: withErrorHandling(async (id, sale) => { const updatedS = await saleService.update(id, sale as any); dispatch({ type: 'UPDATE_SALE', payload: updatedS }); return updatedS; }),
    deleteSale: withErrorHandling(async (id) => { await saleService.delete(id); dispatch({ type: 'DELETE_SALE', payload: id }); }),
    createPurchase: withErrorHandling(async (purchase) => { const newP = await purchaseService.create(purchase as any); dispatch({ type: 'ADD_PURCHASE', payload: newP }); return newP; }),
    updatePurchase: withErrorHandling(async (id, purchase) => { const updatedP = await purchaseService.update(id, purchase as any); dispatch({ type: 'UPDATE_PURCHASE', payload: updatedP }); return updatedP; }),
    deletePurchase: withErrorHandling(async (id) => { await purchaseService.delete(id); dispatch({ type: 'DELETE_PURCHASE', payload: id }); }),
    createEmailTemplate: withErrorHandling(async (template) => { const newET = await emailTemplateService.create(template as any); dispatch({ type: 'ADD_EMAIL_TEMPLATE', payload: newET }); return newET; }),
    updateEmailTemplate: withErrorHandling(async (id, template) => { const updatedET = await emailTemplateService.update(id, template as any); dispatch({ type: 'UPDATE_EMAIL_TEMPLATE', payload: updatedET }); return updatedET; }),
    deleteEmailTemplate: withErrorHandling(async (id) => { await emailTemplateService.delete(id); dispatch({ type: 'DELETE_EMAIL_TEMPLATE', payload: id }); }),
    sendEmail: withErrorHandling(async (_to, _subject, _content, _templateData) => { console.log('Mocked sendEmail'); }),
    createSubscription: withErrorHandling(async (subscription) => { const newS = await subscriptionService.create(subscription as any); dispatch({ type: 'ADD_SUBSCRIPTION', payload: newS }); return newS; }),
    updateSubscription: withErrorHandling(async (id, subscription) => { const updatedS = await subscriptionService.update(id, subscription as any); dispatch({ type: 'UPDATE_SUBSCRIPTION', payload: updatedS }); return updatedS; }),
    deleteSubscription: withErrorHandling(async (id) => { await subscriptionService.delete(id); dispatch({ type: 'DELETE_SUBSCRIPTION', payload: id }); }),
    createSubscriptionProduct: withErrorHandling(async (product) => { const newSP = await subscriptionProductService.create(product as any); dispatch({ type: 'ADD_SUBSCRIPTION_PRODUCT', payload: newSP }); return newSP; }),
    updateSubscriptionProduct: withErrorHandling(async (id, product) => { const updatedSP = await subscriptionProductService.update(id, product as any); dispatch({ type: 'UPDATE_SUBSCRIPTION_PRODUCT', payload: updatedSP }); return updatedSP; }),
    deleteSubscriptionProduct: withErrorHandling(async (id) => { await subscriptionProductService.delete(id); dispatch({ type: 'DELETE_SUBSCRIPTION_PRODUCT', payload: id }); }),
    createSettings: withErrorHandling(async (settings) => { const newS = await settingsService.create(settings as any); dispatch({ type: 'SET_SETTINGS', payload: newS }); return newS; }),
    addPaymentTransaction: withErrorHandling(async (_pt) => { console.log('Mocked addPaymentTransaction'); await loadAllData(); return _pt as PaymentTransaction; }),
    updatePaymentTransaction: withErrorHandling(async (_id, _pt) => { console.log('Mocked updatePaymentTransaction'); await loadAllData(); return _pt as PaymentTransaction; }),
    createInvoice: withErrorHandling(async (invoice) => { const newI = await invoiceService.create(invoice as any); dispatch({ type: 'ADD_INVOICE', payload: newI }); return newI; }),
    updateInvoice: withErrorHandling(async (id, invoice) => { const updatedI = await invoiceService.update(id, invoice as any); dispatch({ type: 'UPDATE_INVOICE', payload: updatedI }); return updatedI; }),
    deleteInvoice: withErrorHandling(async (id) => { await invoiceService.delete(id); dispatch({ type: 'DELETE_INVOICE', payload: id }); }),
    createPayment: withErrorHandling(async (payment) => { const newP = await paymentService.create(payment as any); dispatch({ type: 'ADD_PAYMENT', payload: newP }); return newP; }),
    updatePayment: withErrorHandling(async (id, payment) => { const updatedP = await paymentService.update(id, payment as any); dispatch({ type: 'UPDATE_PAYMENT', payload: updatedP }); return updatedP; }),
    deletePayment: withErrorHandling(async (id) => { await paymentService.delete(id); dispatch({ type: 'DELETE_PAYMENT', payload: id }); }),
    refreshExchangeRates: withErrorHandling(async () => { await fetchExchangeRates(); }),
    revolut: {
      getPaymentStatus: withErrorHandling(async (_paymentRequestId: string) => {
        console.log('Mock Revolut: Getting payment status for', _paymentRequestId);
        return { success: true, data: { status: 'COMPLETED' } };
      }),
    },
  }), [state, loadAllData, fetchExchangeRates, dispatch]);

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