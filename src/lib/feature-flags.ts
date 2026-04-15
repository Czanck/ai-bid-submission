"use client";

import { useState, useEffect, useCallback } from "react";

export interface FeatureFlag {
  id: string;
  label: string;
  description: string;
  defaultValue: boolean;
  /** Flags in the same exclusion group are mutually exclusive */
  exclusionGroup?: string;
  /** A flag ID that must also be enabled for this flag to work */
  requires?: string;
}

// ──────────────────────────────────────────────
// Add new feature flags here:
// ──────────────────────────────────────────────
export const FEATURE_FLAGS: FeatureFlag[] = [
  {
    id: "bid-readiness-check",
    label: "Bid Readiness Check",
    description: "Show only the scope-alignment check (no proposal improvement section)",
    defaultValue: false,
    exclusionGroup: "readiness",
  },
  {
    id: "bid-readiness-check-plus",
    label: "Bid Readiness Check + Proposal Improvement",
    description: "Scope-alignment check plus AI writing feedback and follow-up questions",
    defaultValue: false,
    exclusionGroup: "readiness",
  },
  {
    id: "tabular-submission",
    label: "Tabular Submission",
    description: "Submit bids in a page tab instead of a modal dialog",
    defaultValue: false,
  },
  {
    id: "split-view",
    label: "Split View",
    description: "Two-column layout for the bid submission review step (requires Tabular Submission)",
    defaultValue: false,
    requires: "tabular-submission",
    exclusionGroup: "layout-mode",
  },
  {
    id: "two-step-submission",
    label: "Two Step Submission",
    description: "Break Review & Submit into two steps: Bid Amount + To, then Bid Readiness Check (requires Tabular Submission)",
    defaultValue: false,
    requires: "tabular-submission",
    exclusionGroup: "layout-mode",
  },
];

const STORAGE_KEY = "feature-flags";

function loadFlags(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveFlags(flags: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
}

export function getFlag(id: string): boolean {
  const stored = loadFlags();
  if (id in stored) return stored[id];
  const def = FEATURE_FLAGS.find((f) => f.id === id);
  return def?.defaultValue ?? false;
}

export function useFeatureFlags() {
  const [values, setValues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stored = loadFlags();
    const merged: Record<string, boolean> = {};
    for (const flag of FEATURE_FLAGS) {
      merged[flag.id] = flag.id in stored ? stored[flag.id] : flag.defaultValue;
    }
    setValues(merged);
  }, []);

  const toggle = useCallback((id: string) => {
    setValues((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const flag = FEATURE_FLAGS.find((f) => f.id === id);
      if (next[id]) {
        // Mutual exclusion: if turning on, turn off others in the same group
        if (flag?.exclusionGroup) {
          for (const other of FEATURE_FLAGS) {
            if (other.id !== id && other.exclusionGroup === flag.exclusionGroup) {
              next[other.id] = false;
            }
          }
        }
        // When turning ON a flag that requires another flag, also turn on the required flag
        if (flag?.requires) {
          next[flag.requires] = true;
        }
      } else {
        // When turning OFF a flag, also turn off any flags that require it
        for (const other of FEATURE_FLAGS) {
          if (other.requires === id) {
            next[other.id] = false;
          }
        }
      }
      saveFlags(next);
      return next;
    });
  }, []);

  return { values, toggle };
}
