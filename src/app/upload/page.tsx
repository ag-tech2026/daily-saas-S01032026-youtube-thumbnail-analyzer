"use client";

import { useRouter } from "next/navigation";
import { Lock, Coins } from "lucide-react";
import { toast } from "sonner";
import { UserProfile } from "@/components/auth/user-profile";
import { FileUpload } from "@/components/upload/file-upload";
import { useSession } from "@/lib/auth-client";

export default function UploadPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const handleUploadComplete = () => {
    toast.success("Thumbnail uploaded! Analysis will begin shortly.");
    router.push("/dashboard");
  };

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
              You need to sign in to analyze thumbnails
            </p>
          </div>
          <UserProfile />
        </div>
      </div>
    );
  }

  const userCredits = (session.user as any)?.credits ?? 0;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analyze Your Thumbnail</h1>
          <p className="text-muted-foreground mb-4">
            Upload your YouTube thumbnail and get instant AI-powered CTR
            analysis
          </p>
          <div className="flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4 text-primary" />
            <span>
              Credits remaining:{" "}
              <span className="font-semibold tabular-nums">{userCredits}</span>
            </span>
          </div>
        </div>

        <FileUpload
          credits={userCredits}
          onUploadComplete={handleUploadComplete}
        />
      </div>
    </div>
  );
}
