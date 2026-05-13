import { NextResponse } from "next/server";

export async function POST() {
  // NextAuth handles session invalidation via its own /api/auth/signout endpoint.
  // This route exists for API contract completeness (Option B / JWT).
  // For Option A (sessions), the client calls next-auth's signOut().
  return new NextResponse(null, { status: 204 });
}
