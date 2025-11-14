import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { amount, userId, isTestMode } = await req.json();

    if (!amount || !userId) {
      throw new Error('Missing required parameters');
    }

    // Get appropriate Razorpay credentials
    const keyId = isTestMode 
      ? Deno.env.get('RAZORPAY_TEST_KEY_ID')
      : Deno.env.get('RAZORPAY_LIVE_KEY_ID');
    
    const keySecret = isTestMode
      ? Deno.env.get('RAZORPAY_TEST_KEY_SECRET')
      : Deno.env.get('RAZORPAY_LIVE_KEY_SECRET');

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured');
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

    const authString = btoa(`${keyId}:${keySecret}`);
    
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Razorpay API error: ${JSON.stringify(errorData)}`);
    }

    const order = await response.json();

    return new Response(
      JSON.stringify({
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
    console.error('Error creating Razorpay order:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
