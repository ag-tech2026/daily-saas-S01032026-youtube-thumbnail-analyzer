import { SignUpCtaButton } from "@/components/landing/sign-up-cta-button";

export function LandingCtaSection() {
  return (
    <section className="container mx-auto px-4 py-16 text-center">
      <h2 className="text-3xl font-bold tracking-tight mb-4">
        Ready to Improve Your Poker Game?
      </h2>
      <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
        Join players who analyze their hands with AI-powered GTO feedback.
      </p>
      <SignUpCtaButton size="lg" />
    </section>
  );
}
