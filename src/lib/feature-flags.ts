"use client";

import { useState, useEffect, useCallback } from "react";

export interface FeatureFlag {
  id: string;
  label: string;
  description: string;
  defaultValue: boolean;
}

// ──────────────────────────────────────────────
// Add new feature flags here:
// ──────────────────────────────────────────────
export const FEATURE_FLAGS: FeatureFlag[] = [
  // Example:
  // {
  //   id: "dark-mode",
  //   label: "Dark Mode",
  //   description: "Enable dark mode across the app",
  //   defaultValue: false,
  // },
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
      saveFlags(next);
      return next;
    });
  }, []);

  return { values, toggle };
}
