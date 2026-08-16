"use client";

import { useState, useEffect } from "react";
import { SUPPORT_EMAIL } from "@/lib/constants/support-email";

interface ObfuscatedEmailProps {
  className?: string;
}

/**
 * Renders the support email as a clickable mailto: link.
 * The full address is assembled at mount time via JS — not present in static HTML.
 */
export function ObfuscatedEmail({ className }: ObfuscatedEmailProps): JSX.Element {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(`${SUPPORT_EMAIL.user}@${SUPPORT_EMAIL.domain}`);
  }, []);

  if (!email) {
    return <span className={className}>support</span>;
  }

  return (
    <a href={`mailto:${email}`} className={className ?? "text-primary hover:underline font-medium"}>
      {email}
    </a>
  );
}
