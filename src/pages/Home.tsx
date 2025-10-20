import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { LogOut, Sparkles } from "lucide-react";

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ full_name?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    let isCheckingSession = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔔 Home page - Auth State Change:', {
        event: _event,
        hasSession: !!session,
        sessionExpiry: session?.expires_at,
        user: session?.user?.email,
        provider: session?.user?.app_metadata?.provider,
        isCheckingSession
      });
      
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      
      // Only handle auth changes after initial check is complete
      if (!isCheckingSession && _event !== 'INITIAL_SESSION') {
        setLoading(false);
        if (!session) {
          console.log('🚪 Home page - Session lost, redirecting to /auth');
          navigate("/auth", { replace: true });
        } else {
          console.log('✅ Home page - Session maintained');
        }
      }
    });

    // Check for existing session with longer delay for OAuth
    const checkSession = async () => {
      if (!mounted) return;
      
      console.log('🔎 Home page - Starting session check with delay...');
      
      // Longer delay for OAuth callback to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.log('📊 Home page - Session check result:', {
        hasSession: !!session,
        error: error?.message,
        user: session?.user?.email,
        provider: session?.user?.app_metadata?.provider,
        hash: window.location.hash
      });
      
      if (!mounted) return;
      
      isCheckingSession = false;
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        console.log('❌ Home page - No session found, redirecting to /auth');
        navigate("/auth", { replace: true });
      } else {
        console.log('✅ Home page - Valid session confirmed');
        // Fetch user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData);
      }
    };

    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-pulse" />
      
      <div className="relative">
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">Open House</h2>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="mb-8 inline-block">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Thank You For Enrolling
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            This Is Our Next <span className="text-primary font-semibold">Big Project</span> And Launching Soon
          </p>

          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-8 mb-8 max-w-2xl mx-auto">
            <p className="text-lg text-muted-foreground mb-4">
              Welcome to the community, <span className="text-foreground font-semibold">{profile?.full_name || user?.email}</span>!
            </p>
            <p className="text-muted-foreground">
              We're building something special, and you're now part of it. 
              Stay tuned for updates as we bring this vision to life together.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/")}>
              Explore Platform
            </Button>
            <Button size="lg" variant="outline" onClick={() => window.open("https://discord.gg/Nthtn4vNy", "_blank")}>
              Join Discord Community
            </Button>
          </div>

          {/* Features Preview */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Collaboration", desc: "Connect with builders" },
              { title: "Innovation", desc: "Share bold ideas" },
              { title: "Growth", desc: "Build together" },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-6 rounded-lg bg-card/30 border border-border/50 backdrop-blur-sm"
              >
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;
