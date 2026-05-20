"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/Toast";
import { RejectModal } from "./RejectModal";

interface ProfileReviewActionsProps {
  profileId: string;
}

export function ProfileReviewActions({ profileId }: ProfileReviewActionsProps): JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();
  const [validating, setValidating] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  async function handleValidate(): Promise<void> {
    setValidating(true);
    try {
      const res = await fetch(`/api/v1/admin/profiles/${profileId}/validate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error?.message || "Erreur lors de la validation");
        return;
      }
      showToast("Profil validé et publié");
      router.push("/admin/validation/profiles");
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setValidating(false);
    }
  }

  async function handleReject(reason: string): Promise<void> {
    setRejecting(true);
    try {
      const res = await fetch(`/api/v1/admin/profiles/${profileId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error?.message || "Erreur lors du refus");
        return;
      }
      showToast("Profil refusé — email envoyé au propriétaire");
      setRejectOpen(false);
      router.push("/admin/validation/profiles");
      router.refresh();
    } catch {
      showToast("Erreur, veuillez réessayer");
    } finally {
      setRejecting(false);
    }
  }

  const busy = validating || rejecting;

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => setRejectOpen(true)}
          className="inline-flex items-center gap-1.5 px-5 py-[10px] text-[13px] font-semibold text-[#B91C1C] bg-white border border-[#FCA5A5] rounded hover:bg-[#FEF2F2] transition-colors disabled:opacity-60"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>block</span>
          Refuser
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleValidate}
          className="inline-flex items-center gap-1.5 px-5 py-[10px] text-[13px] font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded transition-colors disabled:opacity-60"
        >
          {validating ? (
            <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
          )}
          {validating ? "Validation…" : "Accepter et publier"}
        </button>
      </div>
      <RejectModal open={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={handleReject} submitting={rejecting} />
    </>
  );
}
