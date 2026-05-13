"use client";

import Link from "next/link";
import type { ErrorMapEntry } from "@/lib/auth-error-messages";

interface AuthErrorBannerProps {
  entry: ErrorMapEntry;
}

export default function AuthErrorBanner({ entry }: AuthErrorBannerProps): JSX.Element {
  return (
    <div className="mb-6 flex items-start gap-2.5 p-3 px-4 bg-[#FDE7E9] border border-[#D13438] rounded text-[13px] text-[#A4262C]" role="alert">
      <span className="material-symbols-outlined text-xl shrink-0">error</span>
      <div>
        <p className="font-semibold">{entry.message}</p>
        {entry.ctaLabel && entry.ctaTarget && (
          <Link href={entry.ctaTarget} className="inline-block mt-2 text-xs font-semibold text-[#0078D4] hover:underline">
            {entry.ctaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
