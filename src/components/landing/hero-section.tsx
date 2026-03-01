import { AnalysisMockup } from "@/components/landing/analysis-mockup";
import { SignUpCtaButton } from "@/components/landing/sign-up-cta-button";

export function HeroSection() {
  return (
    <section className="container mx-auto px-4 py-16 lg:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: headline + CTA */}
        <div className="space-y-6">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
            Find Out If Your Poker Plays Are Actually Correct
          </h1>
          <p className="text-xl text-muted-foreground">
            Upload a screenshot of any poker hand. Get instant GTO analysis
            that tells you exactly what you did right and wrong.
          </p>
          <div className="space-y-3">
            <SignUpCtaButton size="lg" className="w-full sm:w-auto" />
            <p className="text-sm text-muted-foreground">
              No credit card required. 3 free analyses on signup.
            </p>
          </div>
        </div>

        {/* Right: analysis mockup */}
        <div>
          <AnalysisMockup />
        </div>
      </div>
    </section>
  );
}
