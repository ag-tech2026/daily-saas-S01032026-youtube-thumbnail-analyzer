"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { AnalysisResult } from "@/lib/analysis-schema";

type AnalysisData = {
  id: string;
  status: string;
  result: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
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

export default function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const res = await fetch(`/api/analyses/${id}`);
        if (res.status === 404) {
          setError("Analysis not found");
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          return;
        }
        const json = await res.json();
        setData(json);
        setLoading(false);
        if (json.status === "complete" || json.status === "failed") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        setLoading(false);
      }
    }

    fetchAnalysis();
    pollRef.current = setInterval(fetchAnalysis, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [id]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-10 w-64 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Error / not found
  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-xl font-semibold mb-2">Analysis not found</h1>
            <p className="text-muted-foreground mb-6">
              This analysis does not exist or you do not have access to it.
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const badge = getStatusBadge(data.status);
  const formattedDate = new Date(data.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Pending / uploaded / processing state
  if (data.status === "pending" || data.status === "uploaded" || data.status === "processing") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-6">
              <Badge variant={badge.variant}>{badge.label}</Badge>
              <span className="text-base text-muted-foreground">{formattedDate}</span>
            </div>

            <div className="flex flex-col items-center py-10 gap-4">
              <Spinner size="lg" />
              <p className="text-lg font-medium text-foreground">
                {data.status === "processing"
                  ? "Analyzing your hand..."
                  : "Waiting to start..."}
              </p>
              <p className="text-base text-muted-foreground">
                This usually takes about 15-30 seconds. The page will update automatically.
              </p>
            </div>

            {data.imageUrl && (
              <div className="mt-6 border-t pt-6">
                <p className="text-base font-medium text-muted-foreground mb-3">Uploaded Screenshot</p>
                <img
                  src={data.imageUrl}
                  alt="Uploaded poker screenshot"
                  className="max-w-sm rounded-lg border"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Failed state
  if (data.status === "failed") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <CardTitle className="text-red-600 dark:text-red-400">Analysis Failed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              We could not analyze this hand. Your credit has been refunded.
            </p>
            <Button asChild>
              <Link href="/upload">Try Another Hand</Link>
            </Button>

            {data.imageUrl && (
              <div className="mt-8 border-t pt-6">
                <p className="text-base font-medium text-muted-foreground mb-3">Uploaded Screenshot</p>
                <img
                  src={data.imageUrl}
                  alt="Uploaded poker screenshot"
                  className="max-w-sm rounded-lg border"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Complete state — parse and render full result
  const analysisResult = JSON.parse(data.result ?? "{}") as AnalysisResult;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Section 1 — Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={
              analysisResult.difficulty_level === "beginner"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800"
                : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-800"
            }
            variant="outline"
          >
            {analysisResult.difficulty_level === "beginner" ? "Beginner" : "Reg"}
          </Badge>
          {analysisResult.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-3 text-base text-muted-foreground">
          <span>{formattedDate}</span>
          <span className="font-medium text-foreground">
            {Math.round(analysisResult.confidence_score.hero_decisions * 100)}% confidence
          </span>
        </div>
      </div>

      {/* Two-column layout: analysis left, sticky screenshot right */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

        {/* Left column — all analysis cards */}
        <div className="flex-1 min-w-0">

          {/* Section 2 — Hand Info card */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{"🃏 Hand Details"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Stakes</p>
                  <p className="text-base font-medium">{analysisResult.hand_info.stakes}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Game Type</p>
                  <p className="text-base font-medium">{analysisResult.hand_info.game_type}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Position</p>
                  <p className="text-base font-medium">{analysisResult.hand_info.hero_position}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Hero&apos;s Hand</p>
                  <p className="text-base font-medium font-mono">{analysisResult.hand_info.hero_hand}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Stack Depth</p>
                  <p className="text-base font-medium">{analysisResult.hand_info.effective_stack_bb} BB</p>
                </div>
              </div>
              {analysisResult.hand_info.assumptions.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Assumptions</p>
                  <ul className="space-y-1">
                    {analysisResult.hand_info.assumptions.map((assumption, i) => (
                      <li key={i} className="text-base italic text-muted-foreground">
                        {assumption}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3 — Board & Action Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Board */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{"🎯 Board"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysisResult.board.flop && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Flop</p>
                    <p className="text-base font-medium font-mono">{analysisResult.board.flop}</p>
                  </div>
                )}
                {analysisResult.board.turn && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Turn</p>
                    <p className="text-base font-medium font-mono">{analysisResult.board.turn}</p>
                  </div>
                )}
                {analysisResult.board.river && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">River</p>
                    <p className="text-base font-medium font-mono">{analysisResult.board.river}</p>
                  </div>
                )}
                {!analysisResult.board.flop && !analysisResult.board.turn && !analysisResult.board.river && (
                  <p className="text-base text-muted-foreground italic">Preflop only — no board cards</p>
                )}
              </CardContent>
            </Card>

            {/* Action Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{"🎯 Action Summary"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Preflop</p>
                  <p className="text-base text-foreground leading-relaxed">{analysisResult.action_summary.preflop}</p>
                </div>
                {analysisResult.action_summary.flop && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Flop</p>
                    <p className="text-base text-foreground leading-relaxed">{analysisResult.action_summary.flop}</p>
                  </div>
                )}
                {analysisResult.action_summary.turn && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Turn</p>
                    <p className="text-base text-foreground leading-relaxed">{analysisResult.action_summary.turn}</p>
                  </div>
                )}
                {analysisResult.action_summary.river && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">River</p>
                    <p className="text-base text-foreground leading-relaxed">{analysisResult.action_summary.river}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Section 4 — Analysis */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{"📊 Analysis"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base text-foreground leading-relaxed">{analysisResult.analysis.summary}</p>
              <div className="flex gap-3 p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
                <div>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                    {"🔥 Bottom Line"}
                  </p>
                  <p className="text-base text-foreground leading-relaxed">{analysisResult.analysis.main_takeaway}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5 — Good Plays */}
          {analysisResult.good_plays.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{"✅ Good Plays"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysisResult.good_plays.map((play, i) => (
                  <div key={i}>
                    <p className="font-semibold text-base text-foreground mb-1">{play.label}</p>
                    <p className="text-base text-muted-foreground leading-relaxed">{play.explanation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Section 6 — Areas to Improve */}
          {analysisResult.areas_to_improve.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{"❌ Areas to Improve"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {analysisResult.areas_to_improve.map((area, i) => (
                  <div key={i}>
                    <p className="font-semibold text-base text-foreground mb-1">
                      {"❌ "}{area.label}
                    </p>
                    <p className="text-base text-foreground leading-relaxed mb-2">{area.mistake}</p>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      <span className="font-medium">Recommended: </span>
                      {area.recommended_line}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Section 7 — Improvement Tips */}
          {analysisResult.improvement_tips.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{"💡 Improvement Tips"}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 list-decimal list-inside">
                  {analysisResult.improvement_tips.map((tip, i) => (
                    <li key={i} className="text-base text-foreground leading-relaxed">
                      {tip}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Screenshot — mobile only (shown below tips on small screens) */}
          {data.imageUrl && (
            <div className="lg:hidden">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{"📸 Screenshot"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={data.imageUrl}
                    alt="Uploaded poker screenshot"
                    className="w-full rounded-lg border"
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right column — sticky screenshot (desktop only) */}
        {data.imageUrl && (
          <div className="hidden lg:block lg:w-[400px] shrink-0">
            <div className="sticky top-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{"📸 Screenshot"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={data.imageUrl}
                    alt="Uploaded poker screenshot"
                    className="w-full rounded-lg border"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
