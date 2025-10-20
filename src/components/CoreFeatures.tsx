import React from "react";
import { MessageSquare, Users, Building2, Rss, Crown, User } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const features = [
  {
    icon: MessageSquare,
    title: "Idea Talk",
    description: "Open, laid-back, chat style",
    detail: "Discuss your ideas in a casual environment"
  },
  {
    icon: Users,
    title: "Co-Founder & Team Match",
    description: "Swipe-style (or classic list)",
    detail: "Find your perfect collaborators with AI matching"
  },
  {
    icon: Building2,
    title: "Build Spaces",
    description: "Collaborate on projects, track progress",
    detail: "Centralized workspace for your team's projects"
  },
  {
    icon: Rss,
    title: "Membership & Investor Access",
    description: "Premium features for power users",
    detail: "Get discovered by investors seeking next-gen talent"
  },
  {
    icon: Crown,
    title: "Builder Crew",
    description: "Get recognition & build an on-site legacy",
    detail: "Showcase your journey & earn community respect"
  },
  {
    icon: User,
    title: "Founder Feed",
    description: "Stories, launches, events, wins — & more",
    detail: "Stay up-to-date with community highlights & updates"
  }
];

const CoreFeatures = () => {
  const { ref, isVisible } = useScrollReveal();
  
  return (
    <section ref={ref} className="py-12 md:py-20 px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3 md:mb-4">
          Core Features — Build Anything, Together
        </h2>
        <p className="text-base md:text-xl text-muted-foreground text-center mb-10 md:mb-16 px-4">
          Everything you need to turn ideas into reality
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 perspective-container">
          {features.map((feature, index) => (
            <div 
              key={index}
              className={`scroll-reveal ${isVisible ? 'revealed' : ''} delay-${(index + 1) * 100} group p-4 md:p-8 rounded-xl bg-card/30 border border-border/50 backdrop-blur-sm hover:bg-card/60 hover:border-primary/50 card-3d-lift`}
              style={{ transitionDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="p-2 md:p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors shrink-0">
                  <feature.icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2">{feature.title}</h3>
                  <p className="text-sm md:text-base text-muted-foreground mb-1 md:mb-2">{feature.description}</p>
                  <p className="text-xs md:text-sm text-muted-foreground/80">{feature.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoreFeatures;
