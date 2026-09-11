import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Shopping Cart — STOREFY",
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
