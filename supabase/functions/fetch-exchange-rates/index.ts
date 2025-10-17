import { corsHeaders } from '../_shared/cors.ts';

const EXCHANGE_API_KEY = Deno.env.get('EXCHANGE_API_KEY') || 'demo-key';
const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/DKK';

interface ExchangeRateResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Fetch exchange rates with DKK as base currency
    const response = await fetch(EXCHANGE_API_URL, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Exchange API error: ${response.status}`);
    }

    const data: ExchangeRateResponse = await response.json();

    // Filter to only include supported currencies
    const supportedCurrencies = ['DKK', 'EUR', 'USD', 'GBP'];
    const filteredRates: Record<string, number> = { DKK: 1 };
    
    supportedCurrencies.forEach(currency => {
      if (data.rates[currency]) {
        filteredRates[currency] = data.rates[currency];
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        base: 'DKK',
        date: data.date,
        rates: filteredRates,
        lastUpdated: new Date().toISOString()
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    
    // Return fallback rates for supported currencies only
    const fallbackRates = {
      DKK: 1,
      EUR: 0.134,
      USD: 0.145,
      GBP: 0.115
    };

    return new Response(
      JSON.stringify({
        success: false,
        base: 'DKK',
        rates: fallbackRates,
        error: 'Using fallback rates',
        lastUpdated: new Date().toISOString()
      }),
      {
        status: 200, // Still return 200 to not break the app
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});