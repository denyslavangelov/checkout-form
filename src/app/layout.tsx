import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geologica } from "next/font/google";
import { Jost } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geologica = Geologica({
  subsets: ["latin", "cyrillic"],
  variable: "--font-geologica",
});

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
});

export const metadata: Metadata = {
  title: "Office Selector",
  description: "Office selector for delivery options",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geologica.variable} ${jost.variable} font-jost antialiased`}>
        {children}
      </body>
    </html>
  );
}
