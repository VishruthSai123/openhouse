import React, { useEffect, useState } from "react";
import { Heart, Mail, Twitter, Linkedin, Instagram, Github } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Footer = () => {
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
    <footer className="py-12 md:py-20 px-4 bg-secondary/50 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[200px] bg-gradient-to-t from-primary/30 via-accent/20 to-transparent blur-[60px] animate-pulse" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
          Join the Movement
        </h2>
        <p className="text-base md:text-xl text-muted-foreground mb-4 md:mb-8 px-4">
          Your skills + Open House = Startups that change lives
        </p>
        <p className="text-base md:text-lg text-muted-foreground/80 mb-6 md:mb-8 italic px-4">
          "Life's short. Ideas won't build themselves."
        </p>
        
        <Button 
          size="lg" 
          variant="outline"
          className="mb-8 md:mb-10"
          asChild
        >
          <a href="mailto:openhouse.creator@gmail.com">
            <Mail className="mr-2 h-4 w-4" />
            Share Your Thoughts
          </a>
        </Button>
        
        <div className="pt-6 md:pt-8 border-t border-border/50 px-4">
          <div className="flex items-center justify-center gap-6 mb-6">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Linkedin className="h-5 w-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Github className="h-5 w-5" />
            </a>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs md:text-sm text-muted-foreground mb-4">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <span className="hidden sm:inline">•</span>
            <a href="#" className="hover:text-primary transition-colors">Terms & Service</a>
            <span className="hidden sm:inline">•</span>
            <a href="#" className="hover:text-primary transition-colors">Contact Support</a>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground/60 mt-4 md:mt-6 flex items-center justify-center gap-2">
            <Heart className="h-3 w-3 md:h-4 md:w-4 text-accent inline" />
            Open House © 2025 — Built for dreamers, with love
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
