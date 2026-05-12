/** @type {import('next').NextConfig} */
const nextConfig = {
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
