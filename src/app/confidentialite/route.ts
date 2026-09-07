import { env } from "@/lib/env";
import { proxyLegalDoc } from "@/lib/legal-proxy";

export const GET = (): Promise<Response> =>
  proxyLegalDoc(env.CONFIDENTIALITE_SOURCE_URL, "Politique de confidentialité");
