import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check, Sparkles, Shield, Zap, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Payment = () => {
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);
  const [isTestMode, setIsTestMode] = useState(import.meta.env.VITE_RAZORPAY_MODE === 'test');
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

      // Get the appropriate Razorpay key based on mode
      const razorpayKey = isTestMode 
        ? import.meta.env.VITE_RAZORPAY_TEST_KEY_ID 
        : import.meta.env.VITE_RAZORPAY_LIVE_KEY_ID;

      if (!razorpayKey) {
        throw new Error('Razorpay key not configured');
      }

      // Call edge function to create Razorpay order
      console.log('Calling create-razorpay-order function...');
      console.log('Request data:', { amount: 100, userId: user.id, isTestMode });
      
      let response;
      try {
        response = await supabase.functions.invoke('create-razorpay-order', {
          body: { 
            amount: 100,
            userId: user.id,
            isTestMode 
          }
        });
      } catch (err: any) {
        console.error('Function invoke failed:', err);
        throw err;
      }

      const { data: orderData, error: orderError } = response;
      
      console.log('Edge function response:', { orderData, orderError });

      // If there's an error, try to parse the response body
      if (orderError) {
        console.error('Edge function error:', orderError);
        
        // Try to get the actual error from the response
        if (orderError.context && orderError.context instanceof Response) {
          try {
            const errorBody = await orderError.context.json();
            console.error('Error response body:', errorBody);
            const errorMsg = errorBody.details || errorBody.error || orderError.message;
            throw new Error(errorMsg);
          } catch (parseErr) {
            console.error('Could not parse error body:', parseErr);
          }
        }
        
        throw new Error(orderError.message || 'Failed to create order');
      }
      
      // Check if response has error in body (400 with error message)
      if (orderData && !orderData.success && orderData.error) {
        const errorMsg = orderData.details || orderData.error;
        console.error('Order creation failed:', errorMsg);
        throw new Error(errorMsg);
      }
      
      if (!orderData?.orderId) {
        console.error('No order ID in response:', orderData);
        throw new Error('Order ID not received from server');
      }

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: 100.00,
          currency: 'INR',
          payment_gateway: 'razorpay',
          transaction_id: orderData.orderId,
          status: 'pending'
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Get user profile for prefill
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Initialize Razorpay
      const options = {
        key: razorpayKey,
        amount: orderData.amount, // Amount from order
        currency: orderData.currency,
        name: 'Open House',
        description: 'One-time Platform Access Fee',
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // Payment successful - verify on backend
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                userId: user.id,
                paymentRecordId: payment.id
              }
            });

            if (verifyError) throw verifyError;

            if (verifyData?.verified) {
              toast({
                title: "Payment Successful! 🎉",
                description: "Welcome to Open House. Let's build something amazing!",
              });
              
              // Refresh the page to update payment status
              window.location.href = '/home';
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error: any) {
            toast({
              title: "Verification Error",
              description: error.message || "Payment verification failed. Please contact support.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: profile?.full_name || '',
          email: profile?.email || user.email,
        },
        notes: {
          user_id: user.id,
          payment_record_id: payment.id
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
              .update({ status: 'cancelled' })
              .eq('id', payment.id)
              .then(() => {
                toast({
                  title: "Payment Cancelled",
                  description: "You can try again whenever you're ready.",
                  variant: "default",
                });
              });
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        // Update payment status to failed
        supabase
          .from('payments')
          .update({ 
            status: 'failed',
            transaction_id: response.error.metadata?.payment_id || payment.transaction_id
          })
          .eq('id', payment.id);

        toast({
          title: "Payment Failed",
          description: response.error.description || "Something went wrong. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
      });

      razorpay.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      
      let errorMessage = "Failed to initiate payment. Please try again.";
      let errorTitle = "Payment Error";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      // Check for specific error types
      if (error.message?.includes('credentials') || error.message?.includes('configured')) {
        errorTitle = "Configuration Error";
        errorMessage = "Payment gateway is not properly configured. Please contact support.";
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorTitle = "Network Error";
        errorMessage = "Please check your internet connection and try again.";
      } else if (error.message?.includes('order')) {
        errorTitle = "Order Creation Failed";
        errorMessage = "Could not create payment order. Please try again.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Demo payment for testing (remove in production)
  const handleDemoPayment = async () => {
    if (!isTestMode) {
      toast({
        title: "Demo Mode Only",
        description: "Switch to test mode to use demo payment",
        variant: "destructive",
      });
      return;
    }

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
          payment_method: 'test',
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
            <div className="flex items-center justify-between mb-4">
              <Badge variant={isTestMode ? "secondary" : "default"} className="text-xs">
                {isTestMode ? "Test Mode" : "Live Mode"}
              </Badge>
              <div className="flex items-center gap-2">
                <Label htmlFor="test-mode" className="text-xs">Test</Label>
                <Switch 
                  id="test-mode"
                  checked={!isTestMode} 
                  onCheckedChange={(checked) => setIsTestMode(!checked)}
                />
                <Label htmlFor="test-mode" className="text-xs">Live</Label>
              </div>
            </div>
            
            {isTestMode && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-left text-yellow-600 dark:text-yellow-400">
                  You're in test mode. Use test card: 4111 1111 1111 1111 | Any future date | Any CVV
                </p>
              </div>
            )}
            
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
                {loading ? 'Processing...' : `Pay ₹100 with Razorpay (${isTestMode ? 'Test' : 'Live'})`}
              </Button>

              {isTestMode && (
                <Button 
                  variant="outline"
                  size="lg" 
                  className="w-full" 
                  onClick={handleDemoPayment}
                  disabled={loading}
                >
                  Quick Demo Payment (Test Mode Only)
                </Button>
              )}
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
