import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password");
  const isPublicItem = pathname.startsWith("/items/");

  // Check for the session cookie (secure prefix on HTTPS, plain on localhost)
  const sessionToken =
    request.cookies.get("__Secure-authjs.session-token") ??
    request.cookies.get("authjs.session-token");
  const isLoggedIn = !!sessionToken;

  // Public item pages are always accessible
  if (isPublicItem) return NextResponse.next();

  // Auth pages: redirect logged-in users to dashboard
  if (isAuthPage) {
    if (isLoggedIn)
      return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  // All other pages require authentication
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|api/upload|_next/static|_next/image|favicon.ico|images|icons|uploads).*)",
  ],
};
