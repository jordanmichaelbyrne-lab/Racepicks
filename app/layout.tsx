import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import MobileBottomNav from "./components/MobileBottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Racepicks.",
  description:
    "Australia's Supercross, Motocross and SMX tipping competition.",

  openGraph: {
    title: "Racepicks.",
    description:
      "Australia's Supercross, Motocross and SMX tipping competition.",
    images: ["/images/share.jpg"],
    siteName: "Racepicks.",
    locale: "en_AU",
    type: "website",
  },

  twitter: {
    card: "summary",
    title: "Racepicks.",
    description:
      "Australia's Supercross, Motocross and SMX tipping competition.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}

        {/* Spacer so the fixed mobile nav doesn't cover page content */}
        <div className="h-24 md:hidden" />

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </body>
    </html>
  );
}