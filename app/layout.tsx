import type { Metadata } from "next";
import { Geist, Geist_Mono, Niconne, Lora } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// Configure all the fonts needed for the application
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const sunflower = localFont({
  src: "../app/fonts/MADE Sunflower PERSONAL USE.otf",
  variable: "--font-sunflower",
  display: "swap",
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const niconne = Niconne({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-niconne',
});

const lora = Lora({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-lora', // Matches the variable used in globals.css
});

export const metadata: Metadata = {
  title: "Sky Nest",
  description: "Luxury hotel accommodations across Sri Lanka - Colombo, Kandy, and Galle",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${niconne.variable} ${lora.variable} ${sunflower.variable}`}
      >
        {children}
      </body>
    </html>
  );
}

