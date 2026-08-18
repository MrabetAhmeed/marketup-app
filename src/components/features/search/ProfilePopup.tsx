"use client";

import { useState, useEffect } from "react";
import PopupHeader from "@/components/shared/PopupHeader";
import BrandUpPublic from "@/components/features/profiles/public/BrandUpPublic";
import TraceUpPublic from "@/components/features/profiles/public/TraceUpPublic";
import LinkUpPublic from "@/components/features/profiles/public/LinkUpPublic";

type ProductKey = "brandup" | "traceup" | "linkup";

interface ProfilePopupProps {
  product: ProductKey;
  slug: string;
  onClose: () => void;
}

export default function ProfilePopup({ product, slug, onClose }: ProfilePopupProps): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/v1/public/${product}/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Profil introuvable");
        return r.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [product, slug]);

  // Lock body scroll when popup is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const companyName = data?.company?.displayName ?? slug;

  return (
    <div className="fixed inset-0 z-[80] bg-white overflow-y-auto overflow-x-hidden">
      <PopupHeader
        product={product}
        companyName={companyName}
        slug={slug}
        onClose={onClose}
      />

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {error && (
        <div className="text-center py-24">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#F5F5F5] mb-6">
            <span className="material-symbols-outlined text-[#8A8886]" style={{ fontSize: 42 }}>search_off</span>
          </div>
          <h2 className="text-2xl font-extrabold text-on-surface mb-3">Profil introuvable</h2>
          <p className="text-on-surface-variant">{error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <div>
          {product === "brandup" && <BrandUpPublic data={data} embedded />}
          {product === "traceup" && <TraceUpPublic data={data} embedded />}
          {product === "linkup" && <LinkUpPublic data={data} embedded />}
        </div>
      )}
    </div>
  );
}
