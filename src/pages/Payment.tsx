import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check, Sparkles, Shield, Zap } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Payment = () => {
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkPaymentStatus();
    loadRazorpayScript();
  }, []);

  const checkPaymentStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('has_paid')
        .eq('id', user.id)
        .single();

      if (profile?.has_paid) {
        navigate('/home');
        return;
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setCheckingPayment(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: 100.00,
          currency: 'INR',
          payment_gateway: 'razorpay',
          status: 'pending'
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Initialize Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_key', // Replace with your Razorpay key
        amount: 10000, // Amount in paise (₹100 = 10000 paise)
        currency: 'INR',
        name: 'Open House',
        description: 'One-time Platform Access Fee',
        image: '/logo.png',
        order_id: '', // You should generate this from backend
        handler: async function (response: any) {
          // Payment successful
          try {
            const { error } = await supabase
              .from('payments')
              .update({
                status: 'completed',
                transaction_id: response.razorpay_payment_id
              })
              .eq('id', payment.id);

            if (error) throw error;

            toast({
              title: "Payment Successful! 🎉",
              description: "Welcome to Open House. Let's build something amazing!",
            });

            navigate('/home');
          } catch (error: any) {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
            });
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: '#9333ea'
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            // Update payment status to failed if dismissed
            supabase
              .from('payments')
              .update({ status: 'failed' })
              .eq('id', payment.id);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Demo payment for testing (remove in production)
  const handleDemoPayment = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Simulate payment success
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: 100.00,
          currency: 'INR',
          payment_gateway: 'demo',
          transaction_id: `demo_${Date.now()}`,
          status: 'completed'
        });

      if (paymentError) throw paymentError;

      toast({
        title: "Demo Payment Successful! 🎉",
        description: "Welcome to Open House. Let's build something amazing!",
      });

      navigate('/home');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Checking payment status...</div>
      </div>
    );
  }

  const features = [
    'Access to Idea Hub & Co-Founder Matching',
    'Create & Join Build Spaces',
    'Book 1:1 Mentorship Sessions',
    'Participate in Idea Battle Arena',
    'Earn Builder Coins & Rewards',
    'Connect with Investors',
    'Lifetime Access - Pay Once',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">One Step Away! 🚀</h1>
          <p className="text-muted-foreground text-lg">
            Join the most exclusive student founder community
          </p>
        </div>

        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Open House Access</CardTitle>
            <CardDescription>Lifetime membership for student founders</CardDescription>
            <div className="mt-6">
              <div className="text-5xl font-bold">₹100</div>
              <div className="text-sm text-muted-foreground mt-1">One-time payment • No subscriptions</div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 space-y-3">
              <Button 
                size="lg" 
                className="w-full" 
                onClick={handlePayment}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Pay ₹100 & Get Started'}
              </Button>

              {/* Demo button - Remove in production */}
              <Button 
                variant="outline"
                size="lg" 
                className="w-full" 
                onClick={handleDemoPayment}
                disabled={loading}
              >
                Demo Payment (Testing Only)
              </Button>
            </div>

            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-2">
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                <span>Instant Access</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By proceeding, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Payment;
