import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Header = () => {
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/40 backdrop-blur-md border-b border-border/30">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-primary">Open House</h1>
        
        <Button 
          variant="outline" 
          onClick={() => navigate(isAuthenticated ? "/home" : "/auth")}
        >
          {isAuthenticated ? "Dashboard" : "Sign In"}
        </Button>
      </div>
    </header>
  );
};

export default Header;
