import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "STOREFY — Multi-Tenant E-Commerce SaaS Platform",
  description:
    "Production-grade multi-tenant e-commerce platform supporting normal commerce, platform dropshipping, and reselling.",
  keywords: ["e-commerce", "saas", "dropshipping", "online store builder", "reselling", "storefy"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
