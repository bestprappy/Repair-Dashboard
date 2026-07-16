import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import { Providers } from "@/components/providers";
import {
  DEFAULT_THEME_COLOR,
  THEME_COLOR_ATTRIBUTE,
  THEME_COLOR_PRESETS,
  THEME_COLOR_STORAGE_KEY,
} from "@/lib/theme-colors";

const themeColorIds = THEME_COLOR_PRESETS.map(({ id }) => id);
const noFlashThemeColorScript = `(function(){try{var c=localStorage.getItem(${JSON.stringify(
  THEME_COLOR_STORAGE_KEY
)});var v=c?JSON.parse(c):null;var t=${JSON.stringify(
  themeColorIds
)}.includes(v)?v:${JSON.stringify(
  DEFAULT_THEME_COLOR
)};document.documentElement.setAttribute(${JSON.stringify(
  THEME_COLOR_ATTRIBUTE
)},t);}catch(e){document.documentElement.setAttribute(${JSON.stringify(
  THEME_COLOR_ATTRIBUTE
)},${JSON.stringify(DEFAULT_THEME_COLOR)});}})();`;

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Repair Analytics | Inventory Operations",
  description:
    "Live repair inventory operations, quality trends, and equipment analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Script
          id="no-flash-theme-color"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: noFlashThemeColorScript }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
