import React from "react";
import { X, Users, Lightbulb, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const features = [
  {
    icon: X,
    title: "No ads, no clutter, no nonsense",
    description: "Pure focus on ideas"
  },
  {
    icon: Users,
    title: "Find makers & co-founders",
    description: "Connect with like-minded builders"
  },
  {
    icon: Lightbulb,
    title: "Access the library of ideas",
    description: "Get inspired by thousands of concepts"
  },
  {
    icon: Sparkles,
    title: "Showcase your portfolio",
    description: "Share your work and get discovered"
  }
];

const WhySection = () => {
  const navigate = useNavigate();
  const { ref, isVisible } = useScrollReveal();

  return (
    <section ref={ref} className="py-12 md:py-20 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-10 md:mb-16">
          Why Open House?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8 md:mb-12 perspective-container">
          {features.map((feature, index) => (
            <div 
              key={index}
              className={`scroll-reveal ${isVisible ? 'revealed' : ''} delay-${(index + 1) * 100} flex items-start gap-3 md:gap-4 p-4 md:p-6 rounded-lg bg-card/50 border border-border/50 backdrop-blur-sm hover:bg-card/80 card-3d-lift`}
              style={{ transitionDelay: `${index * 0.1}s` }}
            >
              <div className="p-2 md:p-3 rounded-lg bg-primary/10 text-primary shrink-0">
                <feature.icon className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">{feature.title}</h3>
                <p className="text-sm md:text-base text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate("/auth")}>
            Open House unlocks all of it.
          </Button>
        </div>
      </div>
    </section>
  );
};

export default WhySection;
