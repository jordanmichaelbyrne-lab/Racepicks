import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
    "Australia's Supercross and Motocross tipping competition.",

  openGraph: {
    title: "Racepicks.",
    description:
      "Australia's Supercross and Motocross tipping competition.",
    url: "https://racepicks.app",
    siteName: "Racepicks.",
    images: [
      {
        url: "/images/share.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_AU",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Racepicks.",
    description:
      "Australia's Supercross and Motocross tipping competition.",
    images: ["/images/share.jpg"],
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
