"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Clock, Coins, Lock, Upload } from "lucide-react";
import { UserProfile } from "@/components/auth/user-profile";
import { PurchaseCreditsButton } from "@/components/purchase-credits-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";

type AnalysisListItem = {
  id: string;
  status: string;
  result: string | null;
  createdAt: string;
  imageUrl: string | null;
};

function getStatusBadge(status: string): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  switch (status) {
    case "complete":
      return { label: "Complete", variant: "default" };
    case "failed":
      return { label: "Failed", variant: "destructive" };
    case "processing":
      return { label: "Processing", variant: "secondary" };
    case "pending":
    case "uploaded":
      return { label: "Pending", variant: "outline" };
    default:
      return { label: status, variant: "outline" };
  }
}

function getOverallVerdict(item: AnalysisListItem): string | null {
  if (item.status !== "complete" || !item.result) {
    return null;
  }
  try {
    const parsed = JSON.parse(item.result);
    return parsed.analysis?.main_takeaway ?? parsed.analysis?.summary ?? null;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCreditsRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Derive processing state from search params
  const purchaseParam = searchParams.get("purchase");
  const isProcessing = purchaseParam === "success";

  // Handle purchase success polling
  useEffect(() => {
    if (!isProcessing || !session?.user) {
      return;
    }

    const currentCredits = (session.user as any)?.credits ?? 0;

    // Initialize tracking on first render with purchase=success
    if (initialCreditsRef.current === null) {
      initialCreditsRef.current = currentCredits;
      startTimeRef.current = Date.now();

      // Poll for credit increase
      pollIntervalRef.current = setInterval(async () => {
        const elapsed = Date.now() - (startTimeRef.current ?? 0);

        // Stop polling after 30 seconds
        if (elapsed > 30000) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          return;
        }

        // Check if credits increased
        const newSession = await fetch("/api/auth/get-session").then(res => res.json());
        const newCredits = newSession?.user?.credits ?? 0;

        if (newCredits > (initialCreditsRef.current ?? 0)) {
          // Credits updated! Clean up and redirect
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          initialCreditsRef.current = null;
          startTimeRef.current = null;
          router.replace("/dashboard");
        }
      }, 3000); // Poll every 3 seconds
    }

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isProcessing, session, router]);

  // Fetch analysis history
  useEffect(() => {
    if (!session) {
      return;
    }

    fetch("/api/analyses")
      .then((res) => res.json())
      .then((data) => {
        setAnalyses(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setAnalyses([]);
      })
      .finally(() => {
        setHistoryLoading(false);
      });
  }, [session]);

  if (isPending) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-8">
            <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Protected Page</h1>
            <p className="text-muted-foreground mb-6">
              You need to sign in to access the dashboard
            </p>
          </div>
          <UserProfile />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Analyze Hand</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Upload a poker screenshot for instant GTO analysis
          </p>
          <Button asChild>
            <Link href="/upload">Upload Screenshot</Link>
          </Button>
        </div>

        <div className="p-6 border border-border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Profile</h2>
          <p className="text-muted-foreground mb-4">
            Manage your account settings and preferences
          </p>
          <div className="space-y-2">
            <p>
              <strong>Name:</strong> {session.user.name}
            </p>
            <p>
              <strong>Email:</strong> {session.user.email}
            </p>
          </div>
        </div>

        <div className="p-6 border border-border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Credits</h2>
          <p className="text-muted-foreground mb-4">
            Your analysis credit balance
          </p>
          <div className="flex items-center gap-3 mb-4">
            <Coins className="h-8 w-8 text-primary" />
            <span className="text-4xl font-bold tabular-nums">
              {(session.user as any)?.credits ?? 0}
            </span>
          </div>
          {isProcessing && (
            <div className="mb-3 text-sm text-muted-foreground">
              Purchase processing... Credits will appear shortly.
            </div>
          )}
          <PurchaseCreditsButton />
        </div>
      </div>

      {/* Recent Analyses */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-2xl font-semibold">Recent Analyses</h2>
        </div>

        {historyLoading && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        )}

        {!historyLoading && analyses.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground mb-3">
              No analyses yet. Upload a poker screenshot to get started!
            </p>
            <Button asChild variant="outline">
              <Link href="/upload">Upload Screenshot</Link>
            </Button>
          </div>
        )}

        {!historyLoading && analyses.length > 0 && (
          <div className="space-y-2">
            {analyses.map((item) => {
              const badge = getStatusBadge(item.status);
              const verdict = getOverallVerdict(item);
              const date = new Date(item.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <Link
                  key={item.id}
                  href={`/analysis/${item.id}`}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <span className="text-sm text-muted-foreground">{date}</span>
                    {verdict ? (
                      <span className="text-sm font-medium">{verdict}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {item.status === "processing"
                          ? "Analysis in progress..."
                          : item.status === "failed"
                          ? "Analysis failed"
                          : "Waiting to process..."}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
