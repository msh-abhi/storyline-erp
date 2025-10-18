import { Reseller, Supplier, DigitalCode, TVBox, Sale, Purchase, ExchangeRates, SupportedCurrency } from '../types';
import { getMonth, getYear } from 'date-fns';

// Helper function to get current year
export const getCurrentYear = (): number => new Date().getFullYear();

// Helper function to get current month (0-indexed)
export const getCurrentMonth = (): number => new Date().getMonth();

// Helper to ensure a value is a number, otherwise return 0
const ensureNumber = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

export function calculateTotalRevenue(sales: Sale[]): number {
  if (!sales) return 0;
  return sales.filter(sale => sale.status === 'completed').reduce((total, sale) => total + ensureNumber(sale.totalPrice), 0);
}

export function calculateOutstandingReceivables(resellers: Reseller[]): number {
  if (!resellers) return 0;
  return resellers.reduce((total, reseller) => total + ensureNumber(reseller.outstandingBalance), 0);
}

export function calculateTotalExpenses(purchases: Purchase[]): number {
  if (!purchases) return 0;
  return purchases.filter(purchase => purchase.status === 'completed').reduce((total, purchase) => total + ensureNumber(purchase.totalCost), 0);
}

export function calculateOutstandingPayables(suppliers: Supplier[]): number {
  if (!suppliers) return 0;
  return suppliers.reduce((total, supplier) => total + ensureNumber(supplier.amountOwed), 0);
}

export function calculateInventoryProfit(sales: Sale[]): number {
  if (!sales) return 0;
  return sales.filter(sale => sale.status === 'completed').reduce((total, sale) => total + ensureNumber(sale.profit), 0);
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
    .reduce((total, purchase) => total + ensureNumber(purchase.totalCost), 0);
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
    .reduce((total, purchase) => total + ensureNumber(purchase.totalCost), 0);
}

export function calculateYearlyProfit(sales: Sale[], purchases: Purchase[], year: number): number {
  const revenue = calculateYearlyRevenue(sales, year);
  const expenses = calculateYearlyExpenses(purchases, year);
  return revenue - expenses;
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
  exchangeRates: ExchangeRates | null,
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