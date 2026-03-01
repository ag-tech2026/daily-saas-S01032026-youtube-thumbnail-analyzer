import { SignUpCtaButton } from "@/components/landing/sign-up-cta-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FREE_FEATURES = [
  "3 hand analyses",
  "Full GTO feedback",
  "Beginner-friendly explanations",
];

const PRO_FEATURES = [
  "50 hand analyses",
  "Never expires",
  "Full GTO feedback",
  "$0.18 per analysis",
];

export function PricingSection() {
  return (
    <section className="container mx-auto px-4 py-16 bg-muted/30">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight">Simple Pricing</h2>
        <p className="text-muted-foreground mt-2">
          Start free. Upgrade when you need more.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {/* Free tier */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Free</CardTitle>
            <p className="text-4xl font-bold mt-1">
              $0
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <svg
                    className="h-4 w-4 text-green-500 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <SignUpCtaButton variant="outline" className="w-full">
              Get Started Free
            </SignUpCtaButton>
          </CardFooter>
        </Card>

        {/* Pro Pack */}
        <Card className="border-primary relative overflow-hidden">
          <Badge className="absolute top-4 right-4">Best Value</Badge>
          <CardHeader>
            <CardTitle className="text-xl">Pro Pack</CardTitle>
            <div className="mt-1">
              <p className="text-4xl font-bold">$9</p>
              <p className="text-sm text-muted-foreground">one-time</p>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <svg
                    className="h-4 w-4 text-green-500 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <SignUpCtaButton className="w-full">
              Sign Up to Purchase
            </SignUpCtaButton>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
