import React, { useState } from 'react';
import { BarChart3, ChevronDown, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  calculateMonthlyProfit,
  calculateYearlyProfit,
  getMonthlyBreakdown,
  getCurrentMonth,
  getCurrentYear,
  formatCurrency
} from '../utils/calculations';

export default function ProfitOverview() {
  const { state } = useApp();
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [isExpanded, setIsExpanded] = useState(false);

  const displayCurrency = state.settings?.currency || 'DKK';
  
  // Calculate profits
  const monthlyProfit = calculateMonthlyProfit(state.sales, state.purchases, selectedYear, selectedMonth);
  const yearlyProfit = calculateYearlyProfit(state.sales, state.purchases, selectedYear);
  const monthlyBreakdown = getMonthlyBreakdown(state.sales, state.purchases, selectedYear);

  // Generate year options (current year and 2 years back)
  const currentYear = getCurrentYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Compact Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Profit Overview</h3>
              <p className="text-xs text-gray-500">
                {monthNames[selectedMonth]} {selectedYear}: {formatCurrency(monthlyProfit, 'DKK', state.exchangeRates, displayCurrency as any)}
                {' • '}
                {selectedYear} Total: {formatCurrency(yearlyProfit, 'DKK', state.exchangeRates, displayCurrency as any)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Quick Month/Year Selectors */}
            <div className="flex items-center space-x-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>
                    {month.slice(0, 3)}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <ChevronDown 
              className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            />
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-6 space-y-6">
          {/* Profit Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {monthNames[selectedMonth]} {selectedYear} Profit
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(monthlyProfit, 'DKK', state.exchangeRates, displayCurrency as any)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Current month net profit</p>
                </div>
                <div className={`p-3 rounded-full ${monthlyProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  {monthlyProfit >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {selectedYear} Total Profit
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(yearlyProfit, 'DKK', state.exchangeRates, displayCurrency as any)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Year-to-date net profit</p>
                </div>
                <div className={`p-3 rounded-full ${yearlyProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  {yearlyProfit >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown Chart */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>{selectedYear} Monthly Breakdown</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {monthlyBreakdown.map((month) => (
                <div 
                  key={month.month} 
                  className={`p-3 rounded-lg border transition-colors ${
                    month.month === selectedMonth 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    {month.monthName.slice(0, 3)}
                  </div>
                  <div className={`text-sm font-semibold ${
                    month.profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(month.profit, 'DKK', state.exchangeRates, displayCurrency as any)}
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>R: {formatCurrency(month.revenue, 'DKK', state.exchangeRates, displayCurrency as any)}</div>
                    <div>E: {formatCurrency(month.expenses, 'DKK', state.exchangeRates, displayCurrency as any)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-3 flex items-center space-x-4">
              <span>R = Revenue</span>
              <span>E = Expenses</span>
              <span className="text-blue-600">• Current selection</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}