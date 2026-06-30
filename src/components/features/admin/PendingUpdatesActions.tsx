"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/Toast";

interface PendingUpdatesActionsProps {
  companyId: string;
}

export function PendingUpdatesActions({ companyId }: PendingUpdatesActionsProps): JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const busy = approving || rejecting;

  async function handleApprove(): Promise<void> {
    setApproving(true);
    try {
      const res = await fetch(`/api/v1/admin/companies/${companyId}/approve-updates`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { showToast(json.error?.message || "Erreur"); return; }
      showToast("Modifications approuvées");
      router.refresh();
    } catch { showToast("Erreur, veuillez réessayer"); } finally { setApproving(false); }
  }

  async function handleReject(): Promise<void> {
    setRejecting(true);
    try {
      const res = await fetch(`/api/v1/admin/companies/${companyId}/reject-updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) { showToast(json.error?.message || "Erreur"); return; }
      showToast("Modifications refusées");
      router.refresh();
    } catch { showToast("Erreur, veuillez réessayer"); } finally { setRejecting(false); }
  }

  return (
    <div className="flex items-center gap-3">
      <button type="button" disabled={busy} onClick={handleReject}
        className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-[#B91C1C] bg-white border border-[#FCA5A5] rounded hover:bg-[#FEF2F2] transition-colors disabled:opacity-60">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>block</span>Refuser
      </button>
      <button type="button" disabled={busy} onClick={handleApprove}
        className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded transition-colors disabled:opacity-60">
        {approving
          ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
          : <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>}
        {approving ? "Approbation…" : "Approuver"}
      </button>
    </div>
  );
}
