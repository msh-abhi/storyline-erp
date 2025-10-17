import { Reseller, Supplier, DigitalCode, TVBox, Sale, Purchase, ExchangeRates, SupportedCurrency } from '../types';

export function calculateTotalRevenue(sales: Sale[]): number {
  return sales.filter(sale => sale.status === 'completed').reduce((total, sale) => total + sale.totalAmount, 0);
}

export function calculateOutstandingReceivables(resellers: Reseller[]): number {
  return resellers.reduce((total, reseller) => total + reseller.outstandingPayment, 0);
}

export function calculateTotalExpenses(purchases: Purchase[]): number {
  return purchases.filter(purchase => purchase.status === 'completed').reduce((total, purchase) => total + purchase.totalAmount, 0);
}

export function calculateOutstandingPayables(suppliers: Supplier[]): number {
  return suppliers.reduce((total, supplier) => total + supplier.amountOwed, 0);
}

export function calculateInventoryProfit(sales: Sale[]): number {
  return sales.filter(sale => sale.status === 'completed').reduce((total, sale) => total + sale.profit, 0);
}

export function calculateInventoryValue(digitalCodes: DigitalCode[], tvBoxes: TVBox[]): number {
  const digitalCodeValue = digitalCodes.reduce((total, code) => {
    const remainingQuantity = code.quantity - code.soldQuantity;
    return total + (remainingQuantity * code.purchasePrice);
  }, 0);
  
  const tvBoxValue = tvBoxes.reduce((total, box) => {
    const remainingQuantity = box.quantity - box.soldQuantity;
    return total + (remainingQuantity * box.purchasePrice);
  }, 0);
  
  return digitalCodeValue + tvBoxValue;
}

// New functions for monthly and yearly calculations
export function calculateMonthlyRevenue(sales: Sale[], year: number, month: number): number {
  return sales
    .filter(sale => {
      const saleDate = new Date(sale.saleDate);
      return sale.status === 'completed' && 
             saleDate.getFullYear() === year && 
             saleDate.getMonth() === month;
    })
    .reduce((total, sale) => total + sale.totalAmount, 0);
}

export function calculateMonthlyExpenses(purchases: Purchase[], year: number, month: number): number {
  return purchases
    .filter(purchase => {
      const purchaseDate = new Date(purchase.purchaseDate);
      return purchase.status === 'completed' && 
             purchaseDate.getFullYear() === year && 
             purchaseDate.getMonth() === month;
    })
    .reduce((total, purchase) => total + purchase.totalAmount, 0);
}

export function calculateMonthlyProfit(sales: Sale[], purchases: Purchase[], year: number, month: number): number {
  const revenue = calculateMonthlyRevenue(sales, year, month);
  const expenses = calculateMonthlyExpenses(purchases, year, month);
  return revenue - expenses;
}

export function calculateYearlyRevenue(sales: Sale[], year: number): number {
  return sales
    .filter(sale => {
      const saleDate = new Date(sale.saleDate);
      return sale.status === 'completed' && saleDate.getFullYear() === year;
    })
    .reduce((total, sale) => total + sale.totalAmount, 0);
}

export function calculateYearlyExpenses(purchases: Purchase[], year: number): number {
  return purchases
    .filter(purchase => {
      const purchaseDate = new Date(purchase.purchaseDate);
      return purchase.status === 'completed' && purchaseDate.getFullYear() === year;
    })
    .reduce((total, purchase) => total + purchase.totalAmount, 0);
}

export function calculateYearlyProfit(sales: Sale[], purchases: Purchase[], year: number): number {
  const revenue = calculateYearlyRevenue(sales, year);
  const expenses = calculateYearlyExpenses(purchases, year);
  return revenue - expenses;
}

// Get monthly breakdown for a year
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

// Get current month and year
export function getCurrentMonth(): number {
  return new Date().getMonth();
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function convertCurrency(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  exchangeRates: ExchangeRates
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // All rates are relative to DKK (base currency)
  if (fromCurrency === 'DKK') {
    // Converting from DKK to another currency
    const rate = exchangeRates.rates[toCurrency];
    return rate ? amount * rate : amount;
  } else if (toCurrency === 'DKK') {
    // Converting from another currency to DKK
    const rate = exchangeRates.rates[fromCurrency];
    return rate ? amount / rate : amount;
  } else {
    // Converting between two non-DKK currencies
    // First convert to DKK, then to target currency
    const fromRate = exchangeRates.rates[fromCurrency];
    const toRate = exchangeRates.rates[toCurrency];
    if (fromRate && toRate) {
      const dkkAmount = amount / fromRate;
      return dkkAmount * toRate;
    }
    return amount;
  }
}

export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = 'DKK',
  exchangeRates?: ExchangeRates,
  displayCurrency?: SupportedCurrency
): string {
  let displayAmount = amount;
  let finalCurrency = currency;

  // If we have exchange rates and a different display currency, convert
  if (exchangeRates && displayCurrency && displayCurrency !== currency) {
    displayAmount = convertCurrency(amount, currency, displayCurrency, exchangeRates);
    finalCurrency = displayCurrency;
  }

  // Format based on currency
  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: finalCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  };

  // Use appropriate locale for each currency
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
    // Fallback formatting if locale is not supported
    return `${finalCurrency} ${displayAmount.toFixed(2)}`;
  }
}

export function formatCurrencyInput(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  exchangeRates: ExchangeRates
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