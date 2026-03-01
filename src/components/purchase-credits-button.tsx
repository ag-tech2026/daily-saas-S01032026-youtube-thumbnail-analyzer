"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

interface PurchaseCreditsButtonProps {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

export function PurchaseCreditsButton({
  variant = "default",
  size = "default",
  className,
  children = "Buy 50 Credits — $9",
}: PurchaseCreditsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      await authClient.checkout({ slug: "credits-50" });
    } catch (error) {
      console.error("Failed to initiate checkout:", error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleCheckout}
      disabled={isLoading}
    >
      {isLoading ? "Redirecting..." : children}
    </Button>
  );
}
