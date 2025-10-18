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
  // FIX: Destructure new state variables from useAuth
  const { authLoading, authInitialized, isAdmin, authUser } = useAuth();
  const loadDataTriggered = useRef(false);

  console.log('AppContext: AppProvider rendering.', { authInitialized, authLoading, isAdmin });

  const fetchExchangeRates = useCallback(async () => {
    try {
        const rates = await exchangeRateService.getLatest();
        if (rates) {
            dispatch({ type: 'SET_EXCHANGE_RATES', payload: rates });
            console.log("AppContext: Exchange rates fetched/updated:", rates);
        } else {
            console.warn("AppContext: No exchange rates found in database.");
            dispatch({ type: 'SET_EXCHANGE_RATES', payload: null }); // Set to null if no rates found
        }
    } catch (error) {
        console.error("AppContext: Error fetching exchange rates:", error);
        // Don't set error state for exchange rates failure, just log it
        dispatch({ type: 'SET_EXCHANGE_RATES', payload: null }); // Set to null on error
    }
  }, []); // Empty dependency array, as it dispatches to state

  const loadAllData = useCallback(async () => {
    console.debug("AppContext: loadAllData function executing...", { isAdmin, authUser: !!authUser });
    
    if (loadDataTriggered.current) {
      console.debug("AppContext: load already in progress, skipping");
      return;
    }
    
    // Don't load data if user is not authenticated
    if (!authUser) {
      console.debug("AppContext: No authenticated user, skipping data load");
      return;
    }
    
    dispatch({ type: 'SET_LOADING', payload: true });
    loadDataTriggered.current = true;

    try {
      let dataPayload: Partial<AppState> = {};
      
      if (isAdmin) {
        console.debug("AppContext: isAdmin is true, fetching admin-specific data...");
        
        // Fetch exchange rates first as they're needed for calculations
        await fetchExchangeRates();
        
        console.debug("AppContext: Starting to fetch all data services...");
        
        const [
          customers, resellers, suppliers, digitalCodes, tvBoxes, sales,
          purchases, emailTemplates, subscriptions, subscriptionProducts,
          invoices, payments, paymentTransactions, settings
        ] = await Promise.all([
          customerService.getAll().catch(err => { console.error("Error fetching customers:", err); return []; }),
          resellerService.getAll().catch(err => { console.error("Error fetching resellers:", err); return []; }),
          supplierService.getAll().catch(err => { console.error("Error fetching suppliers:", err); return []; }),
          digitalCodeService.getAll().catch(err => { console.error("Error fetching digital codes:", err); return []; }),
          tvBoxService.getAll().catch(err => { console.error("Error fetching tv boxes:", err); return []; }),
          saleService.getAll().catch(err => { console.error("Error fetching sales:", err); return []; }),
          purchaseService.getAll().catch(err => { console.error("Error fetching purchases:", err); return []; }),
          emailTemplateService.getAll().catch(err => { console.error("Error fetching email templates:", err); return []; }),
          subscriptionService.getAll().catch(err => { console.error("Error fetching subscriptions:", err); return []; }),
          subscriptionProductService.getAll().catch(err => { console.error("Error fetching subscription products:", err); return []; }),
          invoiceService.getAll().catch(err => { console.error("Error fetching invoices:", err); return []; }),
          paymentService.getAll().catch(err => { console.error("Error fetching payments:", err); return []; }),
          paymentTransactionService.getAll().catch(err => { console.error("Error fetching payment transactions:", err); return []; }),
          settingsService.get().catch(err => { console.error("Error fetching settings:", err); return null; }),
        ]);
        
        console.debug("AppContext: Data fetch results:", {
          customers: customers?.length || 0,
          resellers: resellers?.length || 0,
          suppliers: suppliers?.length || 0,
          digitalCodes: digitalCodes?.length || 0,
          tvBoxes: tvBoxes?.length || 0,
          sales: sales?.length || 0,
          purchases: purchases?.length || 0,
          subscriptions: subscriptions?.length || 0,
          subscriptionProducts: subscriptionProducts?.length || 0,
          invoices: invoices?.length || 0,
          payments: payments?.length || 0,
          paymentTransactions: paymentTransactions?.length || 0,
          hasSettings: !!settings
        });
        
        dataPayload = {
          customers, resellers, suppliers, digitalCodes, tvBoxes, sales,
          purchases, emailTemplates, subscriptions, subscriptionProducts,
          invoices, payments, paymentTransactions,
          settings: settings || null,
        };
        console.debug("AppContext: 🎉 Admin data fetched successfully.");

      } else {
        console.debug("AppContext: isAdmin is false, fetching exchange rates only.");
        
        // Non-admin users still need exchange rates
        await fetchExchangeRates();
        
        dataPayload = {
          customers: [], resellers: [], suppliers: [], digitalCodes: [], tvBoxes: [], sales: [],
          purchases: [], emailTemplates: [], subscriptions: [], subscriptionProducts: [],
          invoices: [], payments: [], paymentTransactions: [], settings: null
        };
      }

      // Dispatch initial data
      dispatch({
        type: 'SET_INITIAL_DATA',
        payload: dataPayload as any
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("AppContext: ❌ Error loading data", error);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      
      // Try to fetch exchange rates even if other data fails
      try {
        await fetchExchangeRates();
      } catch (rateError) {
        console.error("AppContext: ❌ Error fetching exchange rates:", rateError);
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      loadDataTriggered.current = false;
      console.debug("AppContext: loadAllData finished, loading set to false.");
    }
  }, [isAdmin, authUser, fetchExchangeRates]); // Depend on authUser and isAdmin

  // useEffect to TRIGGER loadAllData based on auth state changes
  useEffect(() => {
    console.debug('AppContext: useEffect trigger check.', { 
      authInitialized, 
      authLoading, 
      isAdmin, 
      loadDataTriggered: loadDataTriggered.current,
      hasAuthUser: !!authUser 
    });

    if (authInitialized && !authLoading && !loadDataTriggered.current && authUser) {
        console.debug('AppContext: ✅ All conditions met, triggering loadAllData.');
        loadAllData();
    } else {
        console.debug('AppContext: ❌ Conditions not met:', {
          authInitialized,
          authLoading,
          loadDataTriggered: loadDataTriggered.current,
          hasAuthUser: !!authUser
        });
        // Reset the trigger flag if auth state changes back to loading/uninitialized
        if (!authInitialized || authLoading) {
          loadDataTriggered.current = false;
        }
    }
  }, [authInitialized, authLoading, isAdmin, authUser]); // Add authUser to dependencies


  const allActions: AppContextType['actions'] = useMemo(() => ({
    loadAllData: loadAllData,
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
