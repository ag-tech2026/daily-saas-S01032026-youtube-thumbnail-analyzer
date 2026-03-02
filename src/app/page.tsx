import { HeroSection } from "@/components/landing/hero-section";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import { PricingSection } from "@/components/landing/pricing-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ThumbnailIQ — Know if Your Thumbnail Will Get Clicked",
  description:
    "Upload your YouTube thumbnail and get instant AI-powered CTR analysis. Scores, strengths, and actionable fixes in 30 seconds. 3 free analyses on signup.",
  openGraph: {
    title: "ThumbnailIQ — Know if Your Thumbnail Will Get Clicked",
    description:
      "Upload your YouTube thumbnail and get instant AI-powered CTR analysis. Scores, strengths, and actionable fixes in 30 seconds. 3 free analyses on signup.",
  },
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <PricingSection />
      <LandingCtaSection />
    </>
  );
}
