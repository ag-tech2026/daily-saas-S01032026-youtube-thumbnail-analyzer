import { HeroSection } from "@/components/landing/hero-section";
import { LandingCtaSection } from "@/components/landing/landing-cta-section";
import { PricingSection } from "@/components/landing/pricing-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Poker AI Review — Instant GTO Analysis from Screenshots",
  description:
    "Upload a poker screenshot and get instant GTO analysis. Find leaks in your game in 30 seconds. 3 free analyses on signup.",
  openGraph: {
    title: "Poker AI Review — Instant GTO Analysis from Screenshots",
    description:
      "Upload a poker screenshot and get instant GTO analysis. Find leaks in your game in 30 seconds. 3 free analyses on signup.",
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
