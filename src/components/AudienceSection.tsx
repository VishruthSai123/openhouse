import React from "react";
import { Lightbulb } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const audiences = [
  {
    title: "Idea Creators",
    description: "Post concepts & find a team"
  },
  {
    title: "Developers",
    description: "Find projects you'll love to build"
  },
  {
    title: "Designers",
    description: "Apply for high-impact projects"
  },
  {
    title: "Editors & Content Creators",
    description: "Join ventures that need your skills"
  },
  {
    title: "Growth & Marketing Wizards",
    description: "Help scale game-changing ideas"
  },
  {
    title: "Investors",
    description: "Discover & support emerging talent"
  }
];

const AudienceSection = () => {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section ref={ref} className="py-12 md:py-20 px-4 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 mb-3 md:mb-4">
            <Lightbulb className="h-6 w-6 md:h-8 md:w-8 text-accent" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
            Everyone Can Join
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground px-4">
            Find your tribe — whatever your calling
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 perspective-container">
          {audiences.map((audience, index) => (
            <div 
              key={index}
              className={`scroll-reveal ${isVisible ? 'revealed' : ''} delay-${(index + 1) * 100} p-4 md:p-6 rounded-lg bg-card border border-border hover:border-primary/50 card-3d-lift glow-hover`}
              style={{ transitionDelay: `${index * 0.1}s` }}
            >
              <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2">{audience.title}</h3>
              <p className="text-sm md:text-base text-muted-foreground">{audience.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AudienceSection;
