import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      companyId: string | null;
      role: "OWNER" | "SUPER_ADMIN";
      email: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    companyId: string | null;
    role: "OWNER" | "SUPER_ADMIN";
    email: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    companyId: string | null;
    role: "OWNER" | "SUPER_ADMIN";
    email: string;
  }
}
