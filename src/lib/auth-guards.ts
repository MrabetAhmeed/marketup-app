import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { AuthError } from "./api-error";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new AuthError("NOT_AUTHENTICATED", "Not signed in", 401);
  }
  return session;
}

export async function requireOwner() {
  const session = await requireSession();
  if (session.user.role !== "OWNER") {
    throw new AuthError("FORBIDDEN", "Owner role required", 403);
  }
  if (!session.user.companyId) {
    throw new AuthError("NO_COMPANY", "No company associated", 403);
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "SUPER_ADMIN") {
    throw new AuthError("FORBIDDEN", "Admin role required", 403);
  }
  return session;
}
