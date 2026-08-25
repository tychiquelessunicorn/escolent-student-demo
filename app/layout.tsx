import type { Metadata, Viewport } from "next";
import { Crimson_Pro, Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist",
  display: "swap",
});

const crimson = Crimson_Pro({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-crimson",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Escolent",
  description: "Adaptive practice, built around what you already understand.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} ${crimson.variable}`}>
      <body>{children}</body>
    </html>
  );
}
