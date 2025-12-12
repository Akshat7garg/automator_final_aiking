"use client";
import HRNavbar from "@/components/hr/HRNavbar";
import HRHeroSection from "@/components/hr/HRHeroSection";
import HRFeaturesSection from "@/components/hr/HRFeaturesSection";
import HRFAQSection from "@/components/hr/HRFAQSection";
import HRCompaniesSection from "@/components/hr/HRCompaniesSection";
import HRHowItWorksSection from "@/components/hr/HRHowItWorks";
import HRResumeATSChecker from "@/components/hr/HRResumeATSChecker";
import HRTestimonialSection from "@/components/hr/HRTestimonialSection";
import HRVideoSection from "@/components/hr/HRVideoSection";
import JobSeeker from "@/components/hr/jobseeker";
import PricingSection from "@/components/hr/pricing";
import WhatsAppButton from "@/components/WhatsAppButton";

export default function HRPage() {
  return (
    <div className="min-h-screen bg-[#11011E]">
      <HRNavbar />
      <HRHeroSection />
      <HRVideoSection />
      <HRCompaniesSection />
      <HRHowItWorksSection />
      <HRFeaturesSection />
      <PricingSection />
      <HRTestimonialSection />
      <HRResumeATSChecker />
      <HRFAQSection />
      <JobSeeker />
      <WhatsAppButton />
    </div>
  );
}