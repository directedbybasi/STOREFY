import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  normalizeHostname,
  isPlatformApexDomain,
  isInternalOrSystemRoute,
} from "@/modules/stores/platform-domains";

export async function middleware(request: NextRequest) {
  const rawHost = request.headers.get("host") || "";
  const normalizedHost = normalizeHostname(rawHost);
  const pathname = request.nextUrl.pathname;

  const startMs = Date.now();
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  // Clone headers for downstream enrichment
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
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

  let hasAuthSession = false;

  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password";
  const isDashboardRoute = pathname.startsWith("/dashboard");

  if (supabaseUrl && supabaseAnonKey && (isDashboardRoute || isAuthRoute)) {
    // Fast-path cookie presence check
    const allCookies = request.cookies.getAll();
    const hasAuthCookie = allCookies.some(
      (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token")
    );

    if (hasAuthCookie) {
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
        // Use lightweight getSession() for middleware routing gate (<2ms vs ~550ms for getUser)
        // Server Components retain authoritative cryptographic getUser() verification
        const { data: { session } } = await supabase.auth.getSession();
        hasAuthSession = !!session?.user;
      } catch {
        hasAuthSession = false;
      }
    } else {
      hasAuthSession = false;
    }
  }

  // 1. Protected Merchant Dashboard Routes: require authenticated session
  if (isDashboardRoute) {
    if (!hasAuthSession) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 2. Public Auth Routes: redirect authenticated users to dashboard
  if (isAuthRoute && hasAuthSession) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // 3. Inject standard security response headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  // 4. Public Storefront Tenant Routing & Rewrites
  // If request is on a tenant subdomain or custom domain, rewrite to dynamic storefront route
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "storefy.shop";
  const isPlatformApex = isPlatformApexDomain(normalizedHost, rootDomain);
  const isSystemRoute = isInternalOrSystemRoute(pathname);

  if (!isPlatformApex && !isSystemRoute) {
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
      rewriteResponse.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
      rewriteResponse.headers.set("x-request-id", requestId);
      rewriteResponse.headers.set("Server-Timing", `middleware;dur=${Date.now() - startMs}`);

      return rewriteResponse;
    }
  }

  response.headers.set("x-request-id", requestId);
  response.headers.set("Server-Timing", `middleware;dur=${Date.now() - startMs}`);

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
