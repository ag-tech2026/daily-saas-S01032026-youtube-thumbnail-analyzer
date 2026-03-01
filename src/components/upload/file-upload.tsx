"use client";

import { useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { InsufficientCreditsDialog } from "./insufficient-credits-dialog";

interface FileUploadProps {
  credits: number;
  onUploadComplete?: (data: {
    analysisId: string;
    imageUrl: string;
    credits: number;
  }) => void;
}

export function FileUpload({ credits, onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreditsDialog, setShowCreditsDialog] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Check if user has credits before proceeding
      if (credits <= 0) {
        setShowCreditsDialog(true);
        return;
      }

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          setError("File too large. Maximum size is 10MB");
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          setError("Only PNG and JPG images are allowed");
        } else {
          setError("File not accepted");
        }
        return;
      }

      // No files accepted
      if (acceptedFiles.length === 0) {
        return;
      }

      const file = acceptedFiles[0];
      if (!file) {
        return;
      }

      setUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (response.status === 402) {
          setShowCreditsDialog(true);
          setUploading(false);
          return;
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(data.error || "Upload failed");
          setUploading(false);
          return;
        }

        const data = await response.json();
        setUploading(false);
        onUploadComplete?.(data);
      } catch (err) {
        setError("Network error. Please try again.");
        setUploading(false);
      }
    },
    [credits, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    disabled: uploading,
  });

  return (
    <>
      <div
        {...getRootProps()}
        className={`
          flex flex-col items-center justify-center
          border-2 border-dashed rounded-lg
          p-12 cursor-pointer
          transition-colors
          ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          }
          ${uploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50"}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">
          {uploading
            ? "Uploading..."
            : "Drag & drop your poker screenshot here"}
        </p>
        <p className="text-sm text-muted-foreground mb-1">
          or click to select a file
        </p>
        <p className="text-xs text-muted-foreground">PNG or JPG, max 10MB</p>
      </div>

      {error && (
        <p className="mt-4 text-sm text-destructive text-center">{error}</p>
      )}

      <InsufficientCreditsDialog
        open={showCreditsDialog}
        onOpenChange={setShowCreditsDialog}
      />
    </>
  );
}
