"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, XCircle } from "lucide-react";
import { ScoreCard } from "@/components/analysis/score-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { AnalysisResult } from "@/domain";

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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6"><Skeleton className="h-5 w-28" /></div>
        <Skeleton className="h-10 w-64 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />Back to Dashboard
        </Link>
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-xl font-semibold mb-2">Analysis not found</h1>
            <p className="text-muted-foreground mb-6">This analysis does not exist or you do not have access to it.</p>
            <Button asChild variant="outline"><Link href="/dashboard">Back to Dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const badge = getStatusBadge(data.status);
  const formattedDate = new Date(data.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  if (data.status === "pending" || data.status === "uploaded" || data.status === "processing") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />Back to Dashboard
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
                {data.status === "processing" ? "Analyzing your thumbnail..." : "Waiting to start..."}
              </p>
              <p className="text-base text-muted-foreground">This usually takes about 15-30 seconds. The page will update automatically.</p>
            </div>
            {data.imageUrl && (
              <div className="mt-6 border-t pt-6">
                <p className="text-base font-medium text-muted-foreground mb-3">Uploaded Thumbnail</p>
                <img src={data.imageUrl} alt="Uploaded thumbnail" className="max-w-sm rounded-lg border" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.status === "failed") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />Back to Dashboard
        </Link>
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <CardTitle className="text-red-600 dark:text-red-400">Analysis Failed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">We could not analyze this thumbnail. Your credit has been refunded.</p>
            <Button asChild><Link href="/upload">Try Another Thumbnail</Link></Button>
            {data.imageUrl && (
              <div className="mt-8 border-t pt-6">
                <p className="text-base font-medium text-muted-foreground mb-3">Uploaded Thumbnail</p>
                <img src={data.imageUrl} alt="Uploaded thumbnail" className="max-w-sm rounded-lg border" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const analysisResult = JSON.parse(data.result ?? "{}") as AnalysisResult;
  const { thumbnail_info, scores, analysis, strengths, improvements, action_items, tags, confidence_score } = analysisResult;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" />Back to Dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
        <div className="flex items-center gap-3 text-base text-muted-foreground">
          <span>{formattedDate}</span>
          <span className="font-medium text-foreground">{Math.round(confidence_score * 100)}% confidence</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <div className="flex-1 min-w-0">

          <div className="mb-4">
            <ScoreCard scores={scores} />
          </div>

          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{"Thumbnail Details"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {thumbnail_info.title_text && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Detected Text</p>
                    <p className="text-base font-medium">&ldquo;{thumbnail_info.title_text}&rdquo;</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Faces</p>
                  <p className="text-base font-medium">
                    {thumbnail_info.face_count === 0 ? "None" : `${thumbnail_info.face_count} (${thumbnail_info.face_emotion})`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Colors</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {thumbnail_info.dominant_colors.map((color) => (
                      <span key={color} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">{color}</span>
                    ))}
                  </div>
                </div>
              </div>
              {thumbnail_info.assumptions.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Assumptions</p>
                  <ul className="space-y-1">
                    {thumbnail_info.assumptions.map((assumption, i) => (
                      <li key={i} className="text-base italic text-muted-foreground">{assumption}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{"Analysis"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base text-foreground leading-relaxed">{analysis.summary}</p>
              <div className="flex gap-3 p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
                <div>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">{"Bottom Line"}</p>
                  <p className="text-base text-foreground leading-relaxed">{analysis.main_takeaway}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {strengths.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{"Strengths"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {strengths.map((item, i) => (
                  <div key={i}>
                    <p className="font-semibold text-base text-foreground mb-1">{item.label}</p>
                    <p className="text-base text-muted-foreground leading-relaxed">{item.explanation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {improvements.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{"What to Fix"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {improvements.map((item, i) => (
                  <div key={i}>
                    <p className="font-semibold text-base text-foreground mb-1">{item.label}</p>
                    <p className="text-base text-foreground leading-relaxed mb-2">{item.issue}</p>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      <span className="font-medium">Fix: </span>{item.recommendation}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {action_items.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{"Action Items"}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 list-decimal list-inside">
                  {action_items.map((item, i) => (
                    <li key={i} className="text-base text-foreground leading-relaxed">{item}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {data.imageUrl && (
            <div className="lg:hidden">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-lg">{"Thumbnail"}</CardTitle></CardHeader>
                <CardContent>
                  <img src={data.imageUrl} alt="Uploaded thumbnail" className="w-full rounded-lg border" />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {data.imageUrl && (
          <div className="hidden lg:block lg:w-[400px] shrink-0">
            <div className="sticky top-6">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-lg">{"Thumbnail"}</CardTitle></CardHeader>
                <CardContent>
                  <img src={data.imageUrl} alt="Uploaded thumbnail" className="w-full rounded-lg border" />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
