"use client";

import { ReactNode, useEffect, useRef } from "react";

import { useAtomValue } from "jotai";

import { themeColorAtom } from "@/lib/theme-color-atom";
import { THEME_COLOR_ATTRIBUTE } from "@/lib/theme-colors";

/** Applies the selected preset color as a `data-theme-color` attribute on `<html>`. */
export function ThemeColorProvider({ children }: { children: ReactNode }) {
  const themeColor = useAtomValue(themeColorAtom);
  const hasMounted = useRef(false);

  useEffect(() => {
    // The beforeInteractive script already applied the stored value. The atom
    // starts with the default and hydrates from storage after mount, so writing
    // this first value would briefly replace the restored theme.
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    document.documentElement.setAttribute(THEME_COLOR_ATTRIBUTE, themeColor);
  }, [themeColor]);

  return children;
}
