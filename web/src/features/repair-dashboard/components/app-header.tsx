"use client";

import { useEffect, useState } from "react";

import { useAtomValue } from "jotai";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { summaryAtom } from "../state/atoms";

/** Sticky top bar: brand, dataset summary badge, theme toggle. */
export function AppHeader() {
  const summary = useAtomValue(summaryAtom);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <header className="sticky top-0 z-50 flex h-[62px] items-center gap-4 border-b border-border bg-background/90 px-7 backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-[#4f8ef7] to-[#7c5cfc] font-heading text-sm font-extrabold text-white">
          RA
        </span>
        <span className="font-heading text-base font-bold tracking-tight">
          Repair<span className="text-primary">Analytics</span>
        </span>
      </div>

      <span className="ml-auto rounded-md border border-border bg-muted/60 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
        {summary}
      </span>

      <button
        type="button"
        aria-label="Toggle theme"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="flex size-8.5 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {mounted && !isDark ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )}
      </button>
    </header>
  );
}
