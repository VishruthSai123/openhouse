import React, { useEffect, useState } from "react";
import { UserPlus, Share2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const steps = [
  {
    icon: UserPlus,
    number: "01",
    title: "Join & Build Your Profile",
    description: "Sign up in seconds. Showcase your skills, projects, & what fires you up."
  },
  {
    icon: Share2,
    number: "02",
    title: "Share Your Idea / Skills",
    description: "Post your concepts or browse projects seeking talent like yours."
  },
  {
    icon: Rocket,
    number: "03",
    title: "Collaborate & Launch",
    description: "Team up, build together, & ship it. The community has your back."
  }
];

const HowItWorks = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { ref, isVisible } = useScrollReveal();

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
    <section ref={ref} id="how-it-works" className="py-12 md:py-20 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-10 md:mb-16">
          How It Works — 3 Steps to Start
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8 mb-8 md:mb-12 perspective-container">
          {steps.map((step, index) => (
            <div 
              key={index}
              className={`scroll-reveal ${isVisible ? 'revealed' : ''} delay-${(index + 1) * 100} relative text-center group px-4`}
              style={{ transitionDelay: `${index * 0.15}s` }}
            >
              <div className="relative inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 mb-4 md:mb-6 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <step.icon className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                <span className="absolute -top-2 -right-2 w-7 h-7 md:w-8 md:h-8 rounded-full bg-accent text-accent-foreground text-xs md:text-sm font-bold flex items-center justify-center">
                  {step.number}
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3">{step.title}</h3>
              <p className="text-sm md:text-base text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
        
        {!isAuthenticated && (
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center px-4">
            <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/auth")}>
              See Tour
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default HowItWorks;
