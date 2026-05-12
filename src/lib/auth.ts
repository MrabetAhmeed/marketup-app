import CredentialsProvider from "next-auth/providers/credentials";
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

        // TODO: Wire to User model in Phase 1/2
        // 1. await connectDb()
        // 2. const user = await User.findOne({ email: credentials.email })
        // 3. if (!user) return null
        // 4. const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        // 5. if (!valid) return null
        // 6. Check company.status === "active"
        // 7. Return { id, email, companyId, role }

        return null;
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
        token.email = user.email;
        token.companyId = user.companyId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.email = token.email;
      session.user.companyId = token.companyId;
      session.user.role = token.role;
      return session;
    },
  },
};
