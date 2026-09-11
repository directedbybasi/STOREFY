import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { initializeCheckoutSession } from "@/modules/checkout/service";
import { CheckoutFlow } from "@/components/storefront/checkout-flow";

interface CheckoutPageProps {
  params: Promise<{ domain: string }>;
}

export const metadata: Metadata = {
  title: "Secure Checkout — STOREFY",
  description: "Complete your purchase securely with our protected checkout.",
  robots: { index: false, follow: false },
};

export default async function StorefrontCheckoutPage({ params }: CheckoutPageProps) {
  const { domain } = await params;
  const resolution = await resolveStorefrontTenant(domain);

  if (resolution.status !== "ACTIVE") {
    redirect(`/${domain}`);
  }

  const { store } = resolution;

  // Resolve cart session token from cookie
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("storefy_cart_token")?.value;

  if (!sessionToken) {
    redirect(`/${domain}/cart`);
  }

  // Initialize checkout session (reserves inventory for 15 minutes)
  let checkoutSession;
  try {
    checkoutSession = await initializeCheckoutSession(store.id, sessionToken);
  } catch {
    // If cart is empty or stock insufficient, redirect to cart with error
    redirect(`/${domain}/cart`);
  }

  return <CheckoutFlow initialSession={checkoutSession} domain={domain} />;
}
