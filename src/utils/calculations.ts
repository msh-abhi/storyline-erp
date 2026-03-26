import { Reseller, Supplier, DigitalCode, TVBox, Sale, Purchase, ExchangeRates, SupportedCurrency, Subscription, Invoice } from '../types';
import { ensureNumber } from './numberUtils';

// Helper function to get current year
export const getCurrentYear = (): number => new Date().getFullYear();

// Helper function to get current month (0-indexed)
export const getCurrentMonth = (): number => new Date().getMonth();

/**
 * Total revenue from COMPLETED sales only.
 */
export function calculateTotalRevenue(sales: Sale[]): number {
  if (!sales) return 0;
  return sales
    .filter(sale => sale.status === 'completed')
    .reduce((total, sale) => total + ensureNumber(sale.totalPrice), 0);
}

/**
 * Outstanding balances owed BY resellers TO us.
 */
export function calculateOutstandingReceivables(resellers: Reseller[]): number {
  if (!resellers) return 0;
  return resellers.reduce((total, reseller) => total + ensureNumber(reseller.outstandingBalance), 0);
}

/**
 * Total expenses from COMPLETED purchases only.
 */
export function calculateTotalExpenses(purchases: Purchase[]): number {
  if (!purchases) return 0;
  return purchases
    .filter(purchase => purchase.status === 'completed')
    .reduce((total, purchase) => total + ensureNumber(purchase.totalAmount), 0);
}

/**
 * Outstanding amounts WE owe to suppliers.
 */
export function calculateOutstandingPayables(suppliers: Supplier[]): number {
  if (!suppliers) return 0;
  return suppliers.reduce((total, supplier) => total + ensureNumber(supplier.amountOwed), 0);
}

/**
 * Total profit from COMPLETED sales only (selling price minus purchase cost).
 */
export function calculateInventoryProfit(sales: Sale[]): number {
  if (!sales) return 0;
  return sales
    .filter(sale => sale.status === 'completed')
    .reduce((total, sale) => total + ensureNumber(sale.profit), 0);
}

export function calculateInventoryValue(digitalCodes: DigitalCode[], tvBoxes: TVBox[]): number {
  const digitalCodeValue = (digitalCodes || []).reduce((total, code) => {
    const remainingQuantity = ensureNumber(code.quantity) - ensureNumber(code.soldQuantity);
    return total + (remainingQuantity * ensureNumber(code.purchasePrice));
  }, 0);

  const tvBoxValue = (tvBoxes || []).reduce((total, box) => {
    const remainingQuantity = ensureNumber(box.quantity) - ensureNumber(box.soldQuantity);
    return total + (remainingQuantity * ensureNumber(box.purchasePrice));
  }, 0);

  return digitalCodeValue + tvBoxValue;
}

export function calculateMonthlyRevenue(sales: Sale[], year: number, month: number): number {
  if (!sales) return 0;
  return sales
    .filter(sale => {
      const saleDate = new Date(sale.saleDate);
      return sale.status === 'completed' &&
             saleDate.getFullYear() === year &&
             saleDate.getMonth() === month;
    })
    .reduce((total, sale) => total + ensureNumber(sale.totalPrice), 0);
}

export function calculateMonthlyExpenses(purchases: Purchase[], year: number, month: number): number {
  if (!purchases) return 0;
  return purchases
    .filter(purchase => {
      const purchaseDate = new Date(purchase.purchaseDate);
      return purchase.status === 'completed' &&
             purchaseDate.getFullYear() === year &&
             purchaseDate.getMonth() === month;
    })
    .reduce((total, purchase) => total + ensureNumber(purchase.totalAmount), 0);
}

export function calculateMonthlyProfit(sales: Sale[], purchases: Purchase[], year: number, month: number): number {
  const revenue = calculateMonthlyRevenue(sales, year, month);
  const expenses = calculateMonthlyExpenses(purchases, year, month);
  return revenue - expenses;
}

export function calculateYearlyRevenue(sales: Sale[], year: number): number {
  if (!sales) return 0;
  return sales
    .filter(sale => {
      const saleDate = new Date(sale.saleDate);
      return sale.status === 'completed' && saleDate.getFullYear() === year;
    })
    .reduce((total, sale) => total + ensureNumber(sale.totalPrice), 0);
}

export function calculateYearlyExpenses(purchases: Purchase[], year: number): number {
  if (!purchases) return 0;
  return purchases
    .filter(purchase => {
      const purchaseDate = new Date(purchase.purchaseDate);
      return purchase.status === 'completed' && purchaseDate.getFullYear() === year;
    })
    .reduce((total, purchase) => total + ensureNumber(purchase.totalAmount), 0);
}

export function calculateYearlyProfit(sales: Sale[], purchases: Purchase[], year: number): number {
  const revenue = calculateYearlyRevenue(sales, year);
  const expenses = calculateYearlyExpenses(purchases, year);
  return revenue - expenses;
}

/**
 * Outstanding amount from sales:
 * Only sales where paymentStatus is 'due' (payment NOT yet received).
 * This correctly represents money owed to us from sales transactions.
 * Sales with paymentStatus 'received' are NOT outstanding, even if status is 'pending'.
 */
export function calculateOutstandingFromSales(sales: Sale[]): number {
  if (!sales) return 0;
  return sales
    .filter(sale =>
      sale.paymentStatus === 'due' &&
      sale.status !== 'cancelled'
    )
    .reduce((total, sale) => total + ensureNumber(sale.totalPrice), 0);
}

/**
 * Outstanding amount displayed in the Sales Management module.
 * Same logic: only sales with payment NOT received.
 */
export function calculateOutstandingAmount(sales: Sale[]): number {
  return calculateOutstandingFromSales(sales);
}

export function calculateSubscriptionRevenue(subscriptions: Subscription[]): number {
  if (!subscriptions) return 0;
  return subscriptions.reduce((total, sub) => sub.status === 'active' ? total + ensureNumber(sub.price) : total, 0);
}

/**
 * Reseller credit profit: only include positive outstanding balances (money owed to us by resellers).
 * This is already covered by calculateOutstandingReceivables so it should NOT be added to net profit separately.
 * Keeping this function but returning 0 to avoid double-counting.
 */
export function calculateResellerCreditProfit(_resellers: Reseller[]): number {
  // Reseller outstanding balances are tracked separately in "Outstanding Receivables".
  // Do NOT include here to avoid inflating Net Profit.
  return 0;
}

/**
 * Total of all invoices (regardless of status).
 */
export function calculateTotalInvoicedAmount(invoices: Invoice[]): number {
  if (!invoices) return 0;
  return invoices.reduce((total, inv) => total + ensureNumber(inv.amount), 0);
}

/**
 * Total amount from invoices with status 'paid'.
 */
export function calculateTotalPaidInvoices(invoices: Invoice[]): number {
  if (!invoices) return 0;
  return invoices
    .filter(inv => inv.status === 'paid')
    .reduce((total, inv) => total + ensureNumber(inv.amount), 0);
}

/**
 * Total amount from invoices with status 'pending'.
 * NOTE: Invoices tied to sales with paymentStatus='received' should have been
 * updated to 'paid'. If they haven't, this may still show them as pending.
 */
export function calculateTotalPendingInvoices(invoices: Invoice[]): number {
  if (!invoices) return 0;
  return invoices
    .filter(inv => inv.status === 'pending')
    .reduce((total, inv) => total + ensureNumber(inv.amount), 0);
}

export function calculateNetProfit(totalRevenue: number, totalExpenses: number): number {
  return totalRevenue - totalExpenses;
}

export function getMonthlyBreakdown(sales: Sale[], purchases: Purchase[], year: number): Array<{
  month: number;
  monthName: string;
  revenue: number;
  expenses: number;
  profit: number;
}> {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return months.map((monthName, index) => {
    const revenue = calculateMonthlyRevenue(sales, year, index);
    const expenses = calculateMonthlyExpenses(purchases, year, index);
    const profit = revenue - expenses;

    return {
      month: index,
      monthName,
      revenue,
      expenses,
      profit
    };
  });
}

export function convertCurrency(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  exchangeRates: ExchangeRates | null
): number {
  const numAmount = ensureNumber(amount);
  if (!exchangeRates || fromCurrency === toCurrency) {
    return numAmount;
  }

  if (fromCurrency === 'DKK') {
    const rate = exchangeRates.rates[toCurrency];
    return rate ? numAmount * ensureNumber(rate) : numAmount;
  } else if (toCurrency === 'DKK') {
    const rate = exchangeRates.rates[fromCurrency];
    return rate ? numAmount / ensureNumber(rate) : numAmount;
  } else {
    const fromRate = exchangeRates.rates[fromCurrency];
    const toRate = exchangeRates.rates[toCurrency];
    if (fromRate && toRate) {
      const dkkAmount = numAmount / ensureNumber(fromRate);
      return dkkAmount * ensureNumber(toRate);
    }
    return numAmount;
  }
}

export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = 'DKK',
  exchangeRates: ExchangeRates | null = null,
  displayCurrency?: SupportedCurrency
): string {
  let displayAmount = ensureNumber(amount);
  let finalCurrency = currency;

  if (exchangeRates && displayCurrency && displayCurrency !== currency) {
    displayAmount = convertCurrency(amount, currency, displayCurrency, exchangeRates);
    finalCurrency = displayCurrency;
  }

  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: finalCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  };

  let locale = 'en-US';
  switch (finalCurrency) {
    case 'DKK':
      locale = 'da-DK';
      break;
    case 'EUR':
      locale = 'de-DE';
      break;
    case 'GBP':
      locale = 'en-GB';
      break;
    default:
      locale = 'en-US';
  }

  try {
    return new Intl.NumberFormat(locale, formatOptions).format(displayAmount);
  } catch (error) {
    return `${finalCurrency} ${displayAmount.toFixed(2)}`;
  }
}

export function formatCurrencyInput(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  exchangeRates: ExchangeRates | null
): number {
  return convertCurrency(amount, fromCurrency, toCurrency, exchangeRates);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getSupportedCurrencies(): { code: SupportedCurrency; name: string; symbol: string }[] {
  return [
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'GBP', name: 'British Pound', symbol: '£' }
  ];
}