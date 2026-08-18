/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    cpus: 1,
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
