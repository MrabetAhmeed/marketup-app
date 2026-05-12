import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MARKET-UP | vivasky.media",
  description: "La plateforme digitale des entreprises tunisiennes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
