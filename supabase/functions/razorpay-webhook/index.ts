import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

serve(async (req) => {
  try {
    // Verify webhook signature
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      throw new Error('Missing signature or webhook secret');
    }

    const body = await req.text();
    
    // Verify signature
    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401 }
      );
    }

    const event = JSON.parse(body);
    console.log('Webhook event:', event.event);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different payment events
    switch (event.event) {
      case 'payment.captured':
      case 'payment.authorized': {
        const payment = event.payload.payment.entity;
        const userId = payment.notes?.user_id;

        if (!userId) {
          console.error('No user_id in payment notes');
          break;
        }

        // Find payment record by order_id
        const { data: paymentRecords } = await supabase
          .from('payments')
          .select('*')
          .eq('transaction_id', payment.order_id)
          .eq('user_id', userId);

        if (paymentRecords && paymentRecords.length > 0) {
          const paymentRecord = paymentRecords[0];

          // Update payment status
          await supabase
            .from('payments')
            .update({
              status: 'completed',
              transaction_id: payment.id
            })
            .eq('id', paymentRecord.id);

          // Update user profile
          await supabase
            .from('profiles')
            .update({
              has_paid: true,
              payment_date: new Date().toISOString()
            })
            .eq('id', userId);

          // Award welcome coins if not already awarded
          const { data: existingCoins } = await supabase
            .from('coin_transactions')
            .select('id')
            .eq('user_id', userId)
            .eq('reason', 'Welcome bonus - Platform access purchased');

          if (!existingCoins || existingCoins.length === 0) {
            await supabase
              .from('coin_transactions')
              .insert({
                user_id: userId,
                amount: 100,
                reason: 'Welcome bonus - Platform access purchased',
                reference_type: 'payment',
                reference_id: paymentRecord.id
              });

            // Update builder_coins count
            const { data: profile } = await supabase
              .from('profiles')
              .select('builder_coins')
              .eq('id', userId)
              .single();

            await supabase
              .from('profiles')
              .update({ builder_coins: (profile?.builder_coins || 0) + 100 })
              .eq('id', userId);
          }

          console.log(`Payment successful for user ${userId}`);
        }
        break;
      }

      case 'payment.failed': {
        const payment = event.payload.payment.entity;
        const userId = payment.notes?.user_id;

        if (userId) {
          // Update payment record if exists
          await supabase
            .from('payments')
            .update({ status: 'failed' })
            .eq('transaction_id', payment.order_id)
            .eq('user_id', userId);

          console.log(`Payment failed for user ${userId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
