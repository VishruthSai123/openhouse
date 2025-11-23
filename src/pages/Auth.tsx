import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  fullName: z.string().trim().optional(),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    let isRedirecting = false;

    // Check for OAuth errors in URL
    const checkOAuthErrors = () => {
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');
      const errorDescription = params.get('error_description');
      
      console.log('🔍 Auth page - URL params:', {
        error,
        errorDescription,
        hash: window.location.hash,
        search: window.location.search
      });

      if (error) {
        console.error('❌ OAuth Error:', error, errorDescription);
        toast({
          title: "Authentication Error",
          description: errorDescription || error,
          variant: "destructive",
        });
      }
    };

    checkOAuthErrors();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth page - Auth State Change:', {
        event,
        hasSession: !!session,
        sessionExpiry: session?.expires_at,
        accessToken: session?.access_token ? 'present' : 'missing',
        isRedirecting
      });
      
      if (!mounted || isRedirecting) {
        console.log('⏭️ Auth page - Skipping (mounted:', mounted, 'isRedirecting:', isRedirecting, ')');
        return;
      }
      
      // Only redirect on actual sign in events
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ Auth page - SIGNED_IN event with valid session, checking onboarding status');
        isRedirecting = true;
        
        // Check if user has completed onboarding
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, has_paid')
          .eq('id', session.user.id)
          .single();
        
        setTimeout(() => {
          if (!profile?.onboarding_completed) {
            navigate("/onboarding", { replace: true });
          } else if (!profile?.has_paid) {
            navigate("/payment", { replace: true });
          } else {
            navigate("/home", { replace: true });
          }
        }, 100);
      }
    });

    // Check for existing session with retries for OAuth callback
    const checkSession = async (retryCount = 0) => {
      console.log(`🔎 Auth page - Checking session (attempt ${retryCount + 1})`);
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.log('📊 Auth page - Session check result:', {
        hasSession: !!session,
        error: error?.message,
        user: session?.user?.email,
        provider: session?.user?.app_metadata?.provider
      });
      
      if (error) {
        console.error('❌ Auth page - Session error:', error);
      }
      
      if (session && mounted && !isRedirecting) {
        console.log('✅ Auth page - Existing session found, checking onboarding status');
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, has_paid')
          .eq('id', session.user.id)
          .single();
        
        isRedirecting = true;
        if (!profile?.onboarding_completed) {
          navigate("/onboarding", { replace: true });
        } else if (!profile?.has_paid) {
          navigate("/payment", { replace: true });
        } else {
          navigate("/home", { replace: true });
        }
      } else if (!session && retryCount < 3 && window.location.hash.includes('access_token')) {
        // If we have hash params but no session yet, retry (OAuth callback in progress)
        console.log('⏳ Auth page - Hash params present but no session, retrying...');
        setTimeout(() => {
          if (mounted) checkSession(retryCount + 1);
        }, 500);
      }
    };

    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = authSchema.safeParse({ 
        email, 
        password, 
        fullName: isLogin ? undefined : fullName 
      });

      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Login Failed",
              description: "Invalid email or password. Please try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
            });
          }
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Signup Failed",
              description: "This email is already registered. Please login instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Success!",
            description: "Account created successfully. Welcome to Open House!",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/home`,
      },
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-background to-secondary/20">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-pulse" />
      
      <div className="relative w-full max-w-md">
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-8 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {isLogin ? "Welcome Back" : "Join Open House"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin
                ? "Sign in to continue your journey"
                : "Start building something amazing"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleAuth}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
