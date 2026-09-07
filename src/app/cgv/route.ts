import { env } from "@/lib/env";
import { proxyLegalDoc } from "@/lib/legal-proxy";

export const GET = (): Promise<Response> =>
  proxyLegalDoc(env.CGV_SOURCE_URL, "Conditions Générales de Vente");
