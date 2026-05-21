"use client";

import { useState, useRef, useEffect } from "react";

interface ProductDef {
  key: string;
  name: string;
  icon: string;
  color: string;
  borderColor?: string;
  textColor?: string;
  href: string;
}

const PRODUCTS: ProductDef[] = [
  { key: "brandup", name: "BrandUP", icon: "storefront", color: "#0078D4", href: "/brandup" },
  { key: "traceup", name: "TraceUP", icon: "play_circle", color: "#8764B8", href: "/traceup" },
  { key: "linkup", name: "LinkUP", icon: "qr_code_2", color: "#1A1A1A", borderColor: "#C5A059", textColor: "#C5A059", href: "/linkup" },
];

interface AppLauncherProps {
  current?: "brandup" | "traceup" | "linkup";
}

export default function AppLauncher({ current }: AppLauncherProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
      >
        <span className="material-symbols-outlined text-[22px]">apps</span>
      </button>
      {open && (
        <div className="absolute top-[calc(100%+8px)] right-0 w-[260px] md:w-[320px] bg-white rounded-lg border border-outline-variant p-3 md:p-4 z-[60]" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.16)" }}>
          <div className="grid grid-cols-3 gap-2">
            {PRODUCTS.map((p) => {
              const isCurrent = p.key === current;
              return (
                <a
                  key={p.key}
                  href={p.href}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors group ${
                    isCurrent ? "" : "border-transparent hover:bg-surface-container-low"
                  }`}
                  style={isCurrent ? {
                    borderColor: `${p.color}33`,
                    backgroundColor: `${p.color}0D`,
                  } : undefined}
                >
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center shadow-sm"
                    style={{
                      backgroundColor: p.color,
                      borderColor: p.borderColor ?? "transparent",
                      borderWidth: p.borderColor ? 1 : 0,
                    }}
                  >
                    <span
                      className="material-symbols-outlined text-[22px]"
                      style={{
                        fontVariationSettings: "'FILL' 1",
                        color: p.textColor ?? "#fff",
                      }}
                    >
                      {p.icon}
                    </span>
                  </div>
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: p.textColor ?? p.color }}
                  >
                    {p.name}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
