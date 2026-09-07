import { env } from "@/lib/env";
import { proxyLegalDoc } from "@/lib/legal-proxy";

export const GET = (): Promise<Response> =>
  proxyLegalDoc(env.CGU_SOURCE_URL, "Conditions Générales d'Utilisation");
