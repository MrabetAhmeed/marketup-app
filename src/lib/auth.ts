import CredentialsProvider from "next-auth/providers/credentials";
import { login } from "@/services/auth.service";
import { AuthError } from "@/lib/api-error";
import { connectDb } from "@/lib/db";
import { isSessionInvalidatedByPasswordChange, isSessionInvalidatedByCompanyStatus } from "@/lib/session-check";
import type { NextAuthOptions } from "next-auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let UserModel: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let CompanyModel: any = null;

async function getModels(): Promise<void> {
  if (!UserModel) {
    const { User } = await import("@/models/user.model");
    const { Company } = await import("@/models/company.model");
    UserModel = User;
    CompanyModel = Company;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const result = await login(credentials.email, credentials.password);
          return {
            id: result.id,
            email: result.email,
            companyId: result.companyId,
            role: result.role,
            companyStatus: result.companyStatus,
          };
        } catch (err) {
          if (err instanceof AuthError) {
            // Propagate structured error via message for the client to parse
            throw new Error(
              JSON.stringify({
                code: err.code,
                message: err.message,
                status: err.status,
                details: err.details,
              }),
            );
          }
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign-in: populate token from user object
      if (user) {
        token.id = user.id;
        token.email = user.email ?? "";
        token.companyId = user.companyId;
        token.role = user.role;
        token.companyStatus = user.companyStatus;
        return token;
      }

      // Subsequent requests: check session validity against DB
      // SUPER_ADMIN: skip company check (no company), check passwordChangedAt
      // only if AdminUser has the field (not in this sprint — skip entirely)
      if (token.role === "SUPER_ADMIN") {
        return token;
      }

      // Owner: 2 parallel queries, .select().lean() for minimal cost
      try {
        await connectDb();
        await getModels();

        const [userDoc, companyDoc] = await Promise.all([
          UserModel.findById(token.id).select("passwordChangedAt").lean(),
          token.companyId
            ? CompanyModel.findById(token.companyId).select("status").lean()
            : Promise.resolve(null),
        ]);

        // User deleted from DB → kill session
        if (!userDoc) {
          return { ...token, invalidated: true };
        }

        // Check 1: password changed after token was issued
        if (isSessionInvalidatedByPasswordChange(userDoc.passwordChangedAt, token.iat)) {
          return { ...token, invalidated: true };
        }

        // Check 2: company suspended or deleted (S8)
        if (companyDoc && isSessionInvalidatedByCompanyStatus(companyDoc.status)) {
          return { ...token, invalidated: true };
        }
      } catch (err) {
        // DB unreachable: allow the request through (fail-open)
        // The alternative (fail-closed) would log out all users on a transient DB blip
        console.warn("[auth/jwt] Session check failed (fail-open):", err);
      }

      return token;
    },
    async session({ session, token }) {
      // If token was marked invalid, return null-like session to force logout
      if ((token as Record<string, unknown>).invalidated) {
        // NextAuth v4: returning an empty user causes the client to see no session
        return { ...session, user: { id: "", email: "", companyId: null, role: "OWNER" as const, companyStatus: null } };
      }

      session.user.id = token.id;
      session.user.email = token.email;
      session.user.companyId = token.companyId;
      session.user.role = token.role;
      session.user.companyStatus = token.companyStatus;
      return session;
    },
  },
};
