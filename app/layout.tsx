import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Oswald } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "FormAI: AI form coach & calorie tracker", template: "%s · FormAI" },
  description:
    "Prop up your phone and train. FormAI's camera counts your reps, tracks calories burned and tells you the moment your form slips. Runs entirely on your device; no video is ever uploaded.",
  applicationName: "FormAI",
  appleWebApp: { capable: true, title: "FormAI", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f4eee6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
