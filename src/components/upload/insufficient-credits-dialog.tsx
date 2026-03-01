"use client";

import { PurchaseCreditsButton } from "@/components/purchase-credits-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface InsufficientCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InsufficientCreditsDialog({
  open,
  onOpenChange,
}: InsufficientCreditsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Out of Credits</DialogTitle>
          <DialogDescription>
            You&apos;re out of credits. Get 50 more for just $9 to continue analyzing your poker hands.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <PurchaseCreditsButton />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
