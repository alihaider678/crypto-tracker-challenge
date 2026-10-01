import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CryptoPulse | Live crypto market data",
    template: "%s | CryptoPulse",
  },
  description:
    "Live spot prices, 24h movement and candlestick charts for Binance trading pairs.",
  applicationName: "CryptoPulse",
};

export const viewport: Viewport = {
  themeColor: "#0B0E14",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the theme class before hydration.
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <a
            href="#main"
            className="sr-only z-50 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            Skip to content
          </a>
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
