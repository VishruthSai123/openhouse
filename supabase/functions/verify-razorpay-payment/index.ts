import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

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
    const { orderId, paymentId, signature, userId, paymentRecordId } = await req.json();

    if (!orderId || !paymentId || !signature || !userId) {
      throw new Error('Missing required parameters');
    }

    // Get Razorpay key secret (try both test and live)
    const testKeySecret = Deno.env.get('RAZORPAY_TEST_KEY_SECRET');
    const liveKeySecret = Deno.env.get('RAZORPAY_LIVE_KEY_SECRET');

    // Verify signature
    const verifySignature = (keySecret: string) => {
      const generatedSignature = createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      return generatedSignature === signature;
    };

    const isValidTest = testKeySecret && verifySignature(testKeySecret);
    const isValidLive = liveKeySecret && verifySignature(liveKeySecret);

    if (!isValidTest && !isValidLive) {
      throw new Error('Invalid payment signature');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: paymentId,
        payment_method: isValidTest ? 'test' : 'live'
      })
      .eq('id', paymentRecordId);

    if (paymentError) {
      console.error('Error updating payment:', paymentError);
    }

    // Update user profile to mark as paid
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        has_paid: true,
        payment_date: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // Award welcome coins
    await supabase
      .from('coin_transactions')
      .insert({
        user_id: userId,
        amount: 100,
        reason: 'Welcome bonus - Platform access purchased',
        reference_type: 'payment',
        reference_id: paymentRecordId
      });

    await supabase
      .from('profiles')
      .update({ builder_coins: 100 })
      .eq('id', userId);

    return new Response(
      JSON.stringify({ verified: true, message: 'Payment verified successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Payment verification error:', error);
    return new Response(
      JSON.stringify({ verified: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
