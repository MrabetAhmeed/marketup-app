import { proxyLegalDoc } from "@/lib/legal-proxy";

/**
 * Legacy URL transmitted to the payment provider — must never break.
 * No env variable: this route is frozen and not reconfigurable.
 */
const CGU_CGV_SOURCE_URL = "https://static.vivasky.media/cgu_cgv.html";

export const GET = (): Promise<Response> =>
  proxyLegalDoc(CGU_CGV_SOURCE_URL, "Conditions Générales d'Utilisation et de Vente");
