import { env } from "@/lib/env";
import { proxyLegalDoc } from "@/lib/legal-proxy";

export const GET = (): Promise<Response> =>
  proxyLegalDoc(env.MENTIONS_LEGALES_SOURCE_URL, "Mentions légales");
