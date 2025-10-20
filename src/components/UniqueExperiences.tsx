import React from "react";
import { Radio, Music, Headphones, Trophy, Calendar, Rocket } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const experiences = [
  {
    icon: Radio,
    title: "Idea Radio Arena",
    description: "Pitch live in 60 seconds. Get instant feedback & hype from real builders."
  },
  {
    icon: Music,
    title: "Freestyle Journey Tracker",
    description: "Track your milestones & wins in a shareable timeline. Growth looks good on you."
  },
  {
    icon: Headphones,
    title: "Maker Studio",
    description: "Your personal showcase. Host your projects, portfolio, & creative experiments."
  },
  {
    icon: Trophy,
    title: "Collabs: Jump-Start Moments",
    description: "Quick challenges, side-quests & collab sprints. Keep the fire lit, stay sharp."
  },
  {
    icon: Calendar,
    title: "Open House Session",
    description: "Weekly live AMAs, workshops, & networking. Real faces, real talk."
  },
  {
    icon: Rocket,
    title: "Launch Projects",
    description: "Ship it live & let the community cheer you on. Celebrate the wins together."
  }
];

const UniqueExperiences = () => {
  const { ref, isVisible } = useScrollReveal();
  
  return (
    <section ref={ref} className="py-12 md:py-20 px-4 bg-secondary/20">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3 md:mb-4">
          Unique Experiences — Make It Fun
        </h2>
        <p className="text-base md:text-xl text-muted-foreground text-center mb-10 md:mb-16 px-4">
          More than a platform, it's a movement
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 perspective-container">
          {experiences.map((experience, index) => (
            <div 
              key={index}
              className={`scroll-reveal ${isVisible ? 'revealed' : ''} delay-${(index + 1) * 100} p-4 md:p-6 rounded-lg bg-card/50 border border-border/50 backdrop-blur-sm hover:bg-card hover:border-accent/50 card-3d-lift group`}
              style={{ transitionDelay: `${index * 0.1}s` }}
            >
              <div className="inline-flex p-2 md:p-3 rounded-lg bg-accent/10 text-accent mb-3 md:mb-4 group-hover:bg-accent/20 transition-colors">
                <experience.icon className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2">{experience.title}</h3>
              <p className="text-sm md:text-base text-muted-foreground">{experience.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UniqueExperiences;
