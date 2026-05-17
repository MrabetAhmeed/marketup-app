import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;
  const isApiRoute = pathname.startsWith("/api/v1/");

  // Unauthenticated
  if (!token) {
    // API routes → 401 JSON (no redirect)
    if (isApiRoute) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Session expirée. Veuillez vous reconnecter." } },
        { status: 401 },
      );
    }
    // Page routes → redirect to login
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Dashboard routes require OWNER role
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api/v1/me")) {
    if (token.role !== "OWNER") {
      if (isApiRoute) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Owner role required" } },
          { status: 403 },
        );
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Admin routes require SUPER_ADMIN role
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/v1/admin")) {
    if (token.role !== "SUPER_ADMIN") {
      if (isApiRoute) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Admin role required" } },
          { status: 403 },
        );
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/v1/me/:path*", "/api/v1/admin/:path*"],
};
