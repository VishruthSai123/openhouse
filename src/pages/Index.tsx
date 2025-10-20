import React from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import WhySection from "@/components/WhySection";
import AudienceSection from "@/components/AudienceSection";
import CoreFeatures from "@/components/CoreFeatures";
import UniqueExperiences from "@/components/UniqueExperiences";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import Vision from "@/components/Vision";
import Masterminds from "@/components/Masterminds";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <WhySection />
      <AudienceSection />
      <CoreFeatures />
      <UniqueExperiences />
      <HowItWorks />
      <Pricing />
      <Vision />
      <Masterminds />
      <Footer />
    </div>
  );
};

export default Index;
