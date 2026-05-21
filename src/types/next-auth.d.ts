import type { CompanyStatus } from "@/types";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      companyId: string | null;
      role: "OWNER" | "SUPER_ADMIN";
      email: string;
      companyStatus: CompanyStatus | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    companyId: string | null;
    role: "OWNER" | "SUPER_ADMIN";
    email: string;
    companyStatus: CompanyStatus | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    companyId: string | null;
    role: "OWNER" | "SUPER_ADMIN";
    email: string;
    companyStatus: CompanyStatus | null;
  }
}
