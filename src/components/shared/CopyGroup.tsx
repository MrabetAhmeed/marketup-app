"use client";

import { useCallback } from "react";
import { useToast } from "@/components/shared/Toast";

interface CopyGroupProps {
  value: string;
}

export function CopyGroup({ value }: CopyGroupProps): JSX.Element {
  const { showToast } = useToast();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      showToast("Lien copié dans le presse-papiers");
    } catch {
      showToast("Copie manuelle requise");
    }
  }, [value, showToast]);

  return (
    <div className="flex items-stretch border border-[#D1D1D1] rounded bg-surface-muted overflow-hidden">
      <input
        type="text"
        readOnly
        value={value}
        className="flex-1 px-3 py-2 text-[12.5px] text-[#424242] bg-transparent border-none outline-none min-w-0 font-body"
      />
      <button
        type="button"
        onClick={handleCopy}
        className="px-3.5 text-[12px] font-semibold text-primary bg-white border-l border-[#D1D1D1] hover:bg-primary-light transition-colors inline-flex items-center gap-[5px] whitespace-nowrap"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
          content_copy
        </span>
        Copier
      </button>
    </div>
  );
}
