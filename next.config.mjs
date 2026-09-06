/**
 * HSTS max-age in seconds.
 *
 * ATTENTION : cet en-tete est memorise par le navigateur du visiteur pendant
 * la duree annoncee. Une valeur trop longue ne peut PAS etre annulee cote
 * serveur — le visiteur devra attendre l'expiration.
 *
 * Progression prevue :
 *   300       (5 min)   — premier deploiement, valeur actuelle
 *   3600      (1 h)     — apres 24h sans incident HTTPS en production
 *   86400     (1 jour)  — apres 1 semaine sans incident
 *   31536000  (1 an)    — apres 1 mois sans incident, valeur definitive
 *
 * Avant chaque palier, verifier :
 *   1. Le certificat TLS est valide et se renouvelle automatiquement
 *   2. Toutes les pages (publiques, dashboard, admin, CGU) repondent en HTTPS
 *   3. Aucune ressource mixte (HTTP) n'est chargee dans la console navigateur
 *   4. Les sous-domaines (static, lifeup, test) ne sont PAS inclus (pas de includeSubDomains)
 *
 * Pour changer : modifier la constante ci-dessous, rebuild, deployer.
 */
const HSTS_MAX_AGE = 300;

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    cpus: 1,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: `max-age=${HSTS_MAX_AGE}` },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/dashboard/billing", destination: "/dashboard/commandes", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
      { protocol: "https", hostname: "s1.dmcdn.net" },
      { protocol: "https", hostname: "cdn.vivasky.media" },
    ],
  },
};

export default nextConfig;
