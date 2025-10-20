import React from "react";
import { TrendingUp, Globe, Target, Home, Sparkles } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const visionItems = [
  {
    icon: TrendingUp,
    title: "We' aiming for millions of creative builders"
  },
  {
    icon: Globe,
    title: "Digital infrastructure to launch $1M+ yearly value globally"
  },
  {
    icon: Target,
    title: "Lands that fail forward 🧡 bold tries > safe silence"
  },
  {
    icon: Home,
    title: "Open space that feels human-first & creative-first"
  },
  {
    icon: Sparkles,
    title: "Be the hype on our own generation of unicorns"
  }
];

const Vision = () => {
  const { ref, isVisible } = useScrollReveal();
  
  return (
    <section ref={ref} className="py-12 md:py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-accent/5 rounded-full blur-[150px]" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3 md:mb-4">
          Vision — Build the Next Unicorn Generation
        </h2>
        <p className="text-base md:text-xl text-muted-foreground text-center mb-10 md:mb-16 px-4">
          Together, we're creating something bigger than ourselves
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12 perspective-container">
          {visionItems.map((item, index) => (
            <div 
              key={index}
              className={`scroll-reveal ${isVisible ? 'revealed' : ''} delay-${(index + 1) * 100} p-4 md:p-6 rounded-lg bg-card/30 border border-border/50 backdrop-blur-sm text-center hover:bg-card/60 hover:border-primary/50 card-3d-lift`}
              style={{ transitionDelay: `${index * 0.1}s` }}
            >
              <div className="inline-flex p-3 md:p-4 rounded-full bg-primary/10 text-primary mb-3 md:mb-4">
                <item.icon className="h-6 w-6 md:h-8 md:w-8" />
              </div>
              <p className="text-base md:text-lg font-medium">{item.title}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Vision;
