import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const Pricing = () => {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="pricing" ref={ref} className="py-12 md:py-20 px-4 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3 md:mb-4">
          Pricing — Just ₹49 to Enter
        </h2>
        <p className="text-base md:text-xl text-muted-foreground text-center mb-10 md:mb-16 px-4">
          Simple, transparent, and affordable for everyone
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto perspective-container">
          {/* Entry Fee */}
          <div className={`scroll-reveal ${isVisible ? 'revealed' : ''} delay-100 p-6 md:p-8 rounded-xl bg-card border-2 border-border hover:border-primary/50 card-3d-lift flex flex-col`}>
            <div className="mb-4 md:mb-6">
              <h3 className="text-xl md:text-2xl font-bold mb-2">Entry Fee</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold text-primary">₹49</span>
                <span className="text-sm md:text-base text-muted-foreground">one-time</span>
              </div>
            </div>
            
            <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
              <li className="flex items-start gap-2 md:gap-3">
                <Check className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm md:text-base">Access to entire platform</span>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <Check className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm md:text-base">Connect with builders</span>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <Check className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm md:text-base">Join collaborative projects</span>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <Check className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm md:text-base">Post unlimited ideas</span>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <Check className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm md:text-base">Portfolio showcase</span>
              </li>
            </ul>
            
            <div className="mt-auto pt-4">
              <div className="text-center py-3 text-lg font-semibold text-muted-foreground">
                Soon
              </div>
            </div>
          </div>
          
          {/* Open House Pro */}
          <div className={`scroll-reveal ${isVisible ? 'revealed' : ''} delay-200 relative p-6 md:p-8 rounded-xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border-2 border-primary hover:border-primary/80 card-3d-lift shadow-lg shadow-primary/20 flex flex-col`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 md:px-4 py-1 rounded-full bg-accent text-accent-foreground text-xs md:text-sm font-bold whitespace-nowrap">
              ⚡ MOST POPULAR
            </div>
            
            <div className="mb-4 md:mb-6">
              <h3 className="text-xl md:text-2xl font-bold mb-2">Open House Pro</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold text-primary">₹99</span>
                <span className="text-sm md:text-base text-muted-foreground">/month</span>
              </div>
            </div>
            
            <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
              <li className="flex items-start gap-2 md:gap-3">
                <Check className="h-4 w-4 md:h-5 md:w-5 text-accent shrink-0 mt-0.5" />
                <span className="text-sm md:text-base font-semibold">Everything in Entry Fee, plus:</span>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <Check className="h-4 w-4 md:h-5 md:w-5 text-accent shrink-0 mt-0.5" />
                <span className="text-sm md:text-base">Priority visibility for projects</span>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <Check className="h-4 w-4 md:h-5 md:w-5 text-accent shrink-0 mt-0.5" />
                <span className="text-sm md:text-base">Advanced analytics dashboard</span>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <Check className="h-4 w-4 md:h-5 md:w-5 text-accent shrink-0 mt-0.5" />
                <span className="text-sm md:text-base">Direct investor access</span>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <Check className="h-4 w-4 md:h-5 md:w-5 text-accent shrink-0 mt-0.5" />
                <span className="text-sm md:text-base">Exclusive community events</span>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <Check className="h-4 w-4 md:h-5 md:w-5 text-accent shrink-0 mt-0.5" />
                <span className="text-sm md:text-base">Premium support</span>
              </li>
            </ul>
            
            <div className="mt-auto pt-4">
              <div className="text-center py-3 text-lg font-semibold text-muted-foreground">
                Soon
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-center text-muted-foreground mt-6 md:mt-8 text-xs md:text-sm px-4">
          100% refunds if you don't vibe. Just email within 7 days. Really. We care.
        </p>
      </div>
    </section>
  );
};

export default Pricing;
