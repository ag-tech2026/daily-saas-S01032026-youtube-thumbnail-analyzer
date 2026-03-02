import { SignUpCtaButton } from "@/components/landing/sign-up-cta-button";

export function LandingCtaSection() {
  return (
    <section className="container mx-auto px-4 py-16 text-center">
      <h2 className="text-3xl font-bold tracking-tight mb-4">
        Ready to Stop Guessing on Thumbnails?
      </h2>
      <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
        Join creators who use AI to predict CTR before publishing.
      </p>
      <SignUpCtaButton size="lg" />
    </section>
  );
}
