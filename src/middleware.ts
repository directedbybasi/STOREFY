import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Normalizes host strings by lowercasing, stripping port, and removing trailing dot.
 */
function normalizeHostname(rawHost: string): string {
  if (!rawHost) return "";
  let host = rawHost.trim().toLowerCase();
  if (host.includes(":")) {
    host = host.split(":")[0];
  }
  if (host.endsWith(".")) {
    host = host.slice(0, -1);
  }
  return host;
}

export async function middleware(request: NextRequest) {
  const rawHost = request.headers.get("host") || "";
  const normalizedHost = normalizeHostname(rawHost);
  const pathname = request.nextUrl.pathname;

  // Clone headers for downstream enrichment
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-url", request.url);
  requestHeaders.set("x-hostname", normalizedHost);
  requestHeaders.set("x-tenant-host", normalizedHost);

  // Initial response
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Supabase Auth session refresh and verification
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user = null;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Parameters<typeof response.cookies.set>[2];
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      // Unauthenticated session or network error
      user = null;
    }
  }

  // 1. Protected Merchant Dashboard Routes: require authenticated session
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 2. Public Auth Routes: redirect authenticated users to dashboard
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password";

  if (isAuthRoute && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // 3. Inject standard security response headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // 4. Public Storefront Tenant Routing & Rewrites
  // If request is on a tenant subdomain or custom domain, rewrite to dynamic storefront route
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "storefy.shop";
  const isPlatformApex =
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost === rootDomain ||
    normalizedHost === `www.${rootDomain}` ||
    normalizedHost === "dev.storefy.shop" ||
    normalizedHost === "staging.storefy.shop";

  const isInternalOrSystemRoute =
    pathname.startsWith("/api") ||
    pathname.startsWith("/dashboard") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  if (!isPlatformApex && !isInternalOrSystemRoute) {
    // Avoid double rewriting if path already contains the normalized host segment
    if (!pathname.startsWith(`/${normalizedHost}`)) {
      const storefrontUrl = new URL(
        `/${normalizedHost}${pathname === "/" ? "" : pathname}${request.nextUrl.search}`,
        request.url
      );
      const rewriteResponse = NextResponse.rewrite(storefrontUrl, {
        request: {
          headers: requestHeaders,
        },
      });

      // Forward security headers
      rewriteResponse.headers.set("X-Content-Type-Options", "nosniff");
      rewriteResponse.headers.set("X-Frame-Options", "SAMEORIGIN");
      rewriteResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

      return rewriteResponse;
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (.svg, .png, .jpg, .ico, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
