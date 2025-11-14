import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== Create Razorpay Order Request ===');
    
    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log('Request body:', JSON.stringify(body));
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          details: 'Request must be valid JSON'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    const { amount, userId, isTestMode } = body;

    // Validate required parameters
    if (!amount) {
      console.error('Missing amount parameter');
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: amount' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    if (!userId) {
      console.error('Missing userId parameter');
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: userId' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    console.log(`Processing order for user: ${userId}, amount: ${amount}, mode: ${isTestMode ? 'test' : 'live'}`);

    // Get appropriate Razorpay credentials
    const keyId = isTestMode 
      ? Deno.env.get('RAZORPAY_TEST_KEY_ID')
      : Deno.env.get('RAZORPAY_LIVE_KEY_ID');
    
    const keySecret = isTestMode
      ? Deno.env.get('RAZORPAY_TEST_KEY_SECRET')
      : Deno.env.get('RAZORPAY_LIVE_KEY_SECRET');

    console.log(`Using ${isTestMode ? 'TEST' : 'LIVE'} credentials`);
    console.log(`Key ID present: ${!!keyId}`);
    console.log(`Key Secret present: ${!!keySecret}`);

    if (!keyId || !keySecret) {
      console.error('Razorpay credentials not configured in environment');
      return new Response(
        JSON.stringify({ 
          error: 'Payment gateway not configured',
          details: `Missing ${isTestMode ? 'test' : 'live'} mode credentials`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      );
    }

    // Create Razorpay order
    const orderData = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `rcpt_${userId}_${Date.now()}`,
      notes: {
        user_id: userId,
        purpose: 'Open House Platform Access Fee'
      }
    };

    console.log('Order data:', JSON.stringify(orderData));

    const authString = btoa(`${keyId}:${keySecret}`);
    
    console.log('Calling Razorpay API...');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(orderData)
    });

    console.log('Razorpay API response status:', response.status);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: await response.text() };
      }
      console.error('Razorpay API error:', JSON.stringify(errorData));
      return new Response(
        JSON.stringify({ 
          error: 'Payment gateway error',
          details: errorData.error?.description || errorData.message || 'Failed to create order',
          statusCode: response.status
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    const order = await response.json();
    console.log('Order created successfully:', order.id);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Unexpected error creating Razorpay order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: errorMessage,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
