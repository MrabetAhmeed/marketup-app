import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  // Unauthenticated — redirect to login
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Dashboard routes require OWNER role
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api/v1/me")) {
    if (token.role !== "OWNER") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Owner role required" } },
        { status: 403 },
      );
    }
  }

  // Admin routes require SUPER_ADMIN role
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/v1/admin")) {
    if (token.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin role required" } },
        { status: 403 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/v1/me/:path*", "/api/v1/admin/:path*"],
};
