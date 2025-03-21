import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geologica } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geologica = Geologica({
  subsets: ["latin", "cyrillic"],
  variable: "--font-geologica",
});

export const metadata: Metadata = {
  title: "Checkout Form",
  description: "Modern checkout form",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geologica.variable} font-geologica antialiased`}>
        {children}
      </body>
    </html>
  );
}
