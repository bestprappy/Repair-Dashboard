"use client";

import { ReactNode, useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as JotaiProvider } from "jotai";
import { ThemeProvider } from "next-themes";

import { ThemeColorProvider } from "@/components/theme-color-provider";

/** App-wide client providers: theme, Jotai UI state, TanStack Query. */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <JotaiProvider>
          <ThemeColorProvider>{children}</ThemeColorProvider>
        </JotaiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
