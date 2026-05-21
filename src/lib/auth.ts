import CredentialsProvider from "next-auth/providers/credentials";
import { login } from "@/services/auth.service";
import { AuthError } from "@/lib/api-error";
import type { NextAuthOptions } from "next-auth";

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
      if (user) {
        token.id = user.id;
        token.email = user.email ?? "";
        token.companyId = user.companyId;
        token.role = user.role;
        token.companyStatus = user.companyStatus;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.email = token.email;
      session.user.companyId = token.companyId;
      session.user.role = token.role;
      session.user.companyStatus = token.companyStatus;
      return session;
    },
  },
};
