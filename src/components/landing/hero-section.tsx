import { AnalysisMockup } from "@/components/landing/analysis-mockup";
import { SignUpCtaButton } from "@/components/landing/sign-up-cta-button";

export function HeroSection() {
  return (
    <section className="container mx-auto px-4 py-16 lg:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
            Know if Your Thumbnail Will Get Clicked — Before You Publish
          </h1>
          <p className="text-xl text-muted-foreground">
            Upload your YouTube thumbnail. Get an instant AI-powered CTR score
            with specific fixes for contrast, text, emotion, and curiosity gap.
          </p>
          <div className="space-y-3">
            <SignUpCtaButton size="lg" className="w-full sm:w-auto" />
            <p className="text-sm text-muted-foreground">
              No credit card required. 3 free analyses on signup.
            </p>
          </div>
        </div>
        <div>
          <AnalysisMockup />
        </div>
      </div>
    </section>
  );
}
