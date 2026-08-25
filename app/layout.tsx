import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

/*
  Crimson Pro + Geist capped the previous pass at "trusted adult SaaS."
  Outfit (display) + Plus Jakarta Sans (body) carry bold geometric energy
  without tipping into a younger children's look.
*/
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
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
    <html lang="en" className={`${outfit.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
