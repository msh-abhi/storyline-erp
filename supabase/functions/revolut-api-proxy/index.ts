import { corsHeaders } from '../_shared/cors.ts';

const REVOLUT_API_KEY = Deno.env.get('REVOLUT_API_KEY');
const REVOLUT_API_BASE_URL = 'https://b2b.revolut.com/api/1.0'; // Or sandbox URL: 'https://sandbox-b2b.revolut.com/api/1.0'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (!REVOLUT_API_KEY) {
      throw new Error('REVOLUT_API_KEY is not set in environment variables.');
    }

    const { method, url, headers: requestHeaders } = req;
    const { pathname, searchParams } = new URL(url);

    // Extract the target path for Revolut API
    const revolutPath = pathname.replace('/functions/v1/revolut-api-proxy', '');

    // Construct the full Revolut API URL
    const revolutApiUrl = `${REVOLUT_API_BASE_URL}${revolutPath}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

    // Prepare headers for the Revolut API request
    const headers = new Headers(requestHeaders);
    headers.set('Authorization', `Bearer ${REVOLUT_API_KEY}`);
    headers.set('Content-Type', 'application/json');
    // Remove host header to prevent issues with proxying
    headers.delete('host');

    let body = null;
    if (method !== 'GET' && method !== 'HEAD') {
      body = await req.text();
    }

    const revolutResponse = await fetch(revolutApiUrl, {
      method,
      headers,
      body: body || undefined,
    });

    const responseBody = await revolutResponse.json();

    return new Response(
      JSON.stringify(responseBody),
      {
        status: revolutResponse.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Revolut API proxy error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      }
    );
  }
});
