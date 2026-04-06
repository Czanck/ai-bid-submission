"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { FEATURE_FLAGS, useFeatureFlags } from "@/lib/feature-flags";

interface FeatureFlagsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeatureFlagsModal({ open, onOpenChange }: FeatureFlagsModalProps) {
  const { values, toggle } = useFeatureFlags();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Flags</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {FEATURE_FLAGS.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No feature flags configured yet.
            </p>
          ) : (
            FEATURE_FLAGS.map((flag) => (
              <div
                key={flag.id}
                className="flex items-center justify-between gap-4"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{flag.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {flag.description}
                  </p>
                </div>
                <Switch
                  checked={values[flag.id] ?? false}
                  onCheckedChange={() => toggle(flag.id)}
                />
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
