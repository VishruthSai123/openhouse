import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import heroBg from "@/assets/hero-bg.jpg";

const Hero = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-20">
      {/* Background effects */}
      <div 
        className="absolute inset-0 bg-center bg-cover bg-no-repeat opacity-30"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background/90" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-pulse" />
      
      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight px-2">
          Open House — <span className="text-primary">Where Bold Ideas Find a Home</span>
        </h1>
        
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 md:mb-10 max-w-3xl mx-auto leading-relaxed px-4">
          Got an idea? A skill? A dream? Join a global community of students who build, create, and launch startups — as founders, developers, designers, editors, marketers, or mentors.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center px-4">
          {!isAuthenticated && (
            <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate("/auth")}>
              Join Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => {
            document.querySelector('[id*="how-it-works"]')?.scrollIntoView({ behavior: "smooth" });
          }}>
            How It Works
          </Button>
        </div>
        
        <p className="text-sm md:text-base text-muted-foreground/80 mt-8 md:mt-12 italic px-4">
          "Don't just talk about ideas. Build them here — in any role you rock."
        </p>
      </div>
    </section>
  );
};

export default Hero;
