import { VivaskyLanding } from "@/components/features/landing/VivaskyLanding";
import type { Metadata, Viewport } from "next";

const TITLE = "vivasky.media — E-motion of Life";
const DESCRIPTION =
  "Vivasky, l'écosystème de l'action responsable structuré autour de 4 piliers : BrandUP, TraceUP, LinkUP et LifeUP.";
const OG_DESCRIPTION =
  "Vivasky, l'écosystème de l'action responsable : BrandUP, TraceUP, LinkUP, LifeUP.";
const SHARE_IMAGE = "https://www.vivasky.media/images/vivasky_logo_share.png";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  other: { "revisit-after": "7 days" },
  openGraph: {
    type: "website",
    siteName: "Vivasky",
    url: "https://www.vivasky.media/",
    title: TITLE,
    description: OG_DESCRIPTION,
    images: [{ url: SHARE_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: OG_DESCRIPTION,
    images: [SHARE_IMAGE],
  },
};

// Fidèle au mockup (user-scalable=no). À reconsidérer côté accessibilité si besoin.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: false,
};

export default function HomePage(): JSX.Element {
  return <VivaskyLanding />;
}
