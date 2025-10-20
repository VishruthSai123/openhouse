import React, { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi,
} from "@/components/ui/carousel";

import manjunathImage from "@/assets/manjunath.png";
import vishruthImage from "@/assets/vishruth.jpg";
import vinushaImage from "@/assets/pfp.jpeg";

const Masterminds = () => {
  const { ref, isVisible } = useScrollReveal();
  const [api, setApi] = React.useState<CarouselApi>();

  // Auto-slide functionality
  useEffect(() => {
    if (!api) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 3000); // Change slide every 3 seconds

    return () => clearInterval(interval);
  }, [api]);
  
  const masterminds = [
    {
      name: "Manjunath Meesala",
      role: "CEO",
      subtitle: "20-year-old visionary entrepreneur, founder of SendRight AI and VIBExSuperApp, leading Product Vision and Innovation",
      image: manjunathImage
    },
    {
      name: "Vishruth Sai", 
      role: "COO",
      subtitle: "Founder & CTO, 17-year-old tech prodigy leading AI engineering & mobile development",
      image: vishruthImage
    },
    {
      name: "Ragala Vinusha",
      role: "CMO",
      subtitle: "Expert in product and marketing strategy, driving brand growth and market expansion",
      image: vinushaImage
    }
  ];

  return (
    <section ref={ref} className="py-12 md:py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3 md:mb-4">
          Master Minds Behind This Revolution
        </h2>
        <p className="text-base md:text-xl text-muted-foreground text-center mb-10 md:mb-16 px-4">
          Meet the visionaries making it happen
        </p>
        
        <div className="max-w-6xl mx-auto perspective-container">
          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {masterminds.map((person, index) => (
                <CarouselItem key={person.name} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                  <div className="h-full">
                    <Card 
                      className={`scroll-reveal ${isVisible ? 'revealed' : ''} delay-${(index + 1) * 100} overflow-hidden border-2 hover:border-primary/50 card-3d-lift glow-hover h-full flex flex-col`}
                      style={{ transitionDelay: `${index * 0.15}s` }}
                    >
                      <CardContent className="p-0 flex flex-col h-full">
                        <div className="aspect-square overflow-hidden flex-shrink-0">
                          <img 
                            src={person.image} 
                            alt={person.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-4 md:p-6 text-center flex-grow flex flex-col justify-center">
                          <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2">{person.name}</h3>
                          <p className="text-base md:text-lg lg:text-xl text-primary font-semibold mb-3">{person.role}</p>
                          <p className="text-xs md:text-sm lg:text-base text-muted-foreground leading-relaxed">{person.subtitle}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default Masterminds;
