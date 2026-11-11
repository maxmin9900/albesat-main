import type { Metadata } from "next";
import { Vazirmatn, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazir",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ALBESAT — Woven on Earth, Inspired by the Heavens",
  description:
    "A collection of handwoven Persian masterpieces — rugs, auctions and a digital certificate of authenticity.",
  keywords: ["Persian carpet", "Persian rug", "carpet auction", "handwoven rug", "ALBESAT"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className={`${vazir.variable} ${cormorant.variable}`}>
      <body>{children}</body>
    </html>
  );
}
