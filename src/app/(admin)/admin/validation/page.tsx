import Link from "next/link";
import { listPendingCompanies, listCompaniesWithPendingUpdates } from "@/services/admin-company.service";
import { listPendingProfiles } from "@/services/admin-profile.service";
import { listPendingRseReceipts } from "@/services/admin-rse.service";
import { ValidationHubTabs } from "@/components/features/admin/ValidationHubTabs";
import type { PendingCompanyItem, PendingUpdateCompanyItem } from "@/services/admin-company.service";
import type { PendingProfileItem } from "@/services/admin-profile.service";

export const dynamic = "force-dynamic";

type TabKey = "inscriptions" | "modifications" | "profils" | "rse";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function ValidationHubPage({ searchParams }: PageProps): Promise<JSX.Element> {
  const { tab } = await searchParams;
  const activeTab: TabKey = (["inscriptions", "modifications", "profils", "rse"] as const).includes(tab as TabKey)
    ? (tab as TabKey)
    : "inscriptions";

  const [inscriptions, modifications, profiles, rseReceipts] = await Promise.all([
    listPendingCompanies("fr"),
    listCompaniesWithPendingUpdates("fr"),
    listPendingProfiles("fr"),
    listPendingRseReceipts("fr"),
  ]);

  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading font-bold text-[22px] text-ink-primary">Validation</h1>
        <p className="text-[13px] text-ink-secondary mt-1">File d&apos;attente centralisée</p>
      </div>

      <ValidationHubTabs
        activeTab={activeTab}
        counts={{
          inscriptions: inscriptions.length,
          modifications: modifications.length,
          profils: profiles.length,
          rse: rseReceipts.length,
        }}
      />

      {activeTab === "inscriptions" && (
        <InscriptionsList companies={inscriptions} />
      )}
      {activeTab === "modifications" && (
        <ModificationsList companies={modifications} />
      )}
      {activeTab === "profils" && (
        <ProfilesList profiles={profiles} />
      )}
      {activeTab === "rse" && (
        <RseList receipts={rseReceipts} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content components (extracted from existing pages)
// ---------------------------------------------------------------------------

function InscriptionsList({ companies }: { companies: PendingCompanyItem[] }): JSX.Element {
  if (companies.length === 0) {
    return (
      <EmptyState icon="how_to_reg" title="Aucun compte en attente" subtitle="Tous les comptes ont été traités." />
    );
  }
  return (
    <div className="space-y-3">
      {companies.map((c) => (
        <div key={c.id} className="bg-white border border-surface-border rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#D97706]/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#D97706]" style={{ fontSize: 22 }}>business</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-heading font-semibold text-[14px] text-ink-primary leading-tight">{c.displayName}</div>
            <div className="flex items-center gap-2 mt-1 text-[12px] text-ink-secondary flex-wrap">
              <span>{c.type}</span>
              <span>·</span>
              <span>{c.sector}</span>
              <span>·</span>
              <span>{c.gouvernorat}, {c.ville}</span>
              <span>·</span>
              <span>Inscrit le {new Date(c.registeredAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
              {c.hasLegalDoc && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-0.5 text-[#16A34A]">
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>description</span>
                    PDF
                  </span>
                </>
              )}
            </div>
          </div>
          <Link
            href={`/admin/validation/comptes/${c.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#5C2D91] hover:bg-[#4A2377] rounded transition-colors shrink-0"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
            Examiner
          </Link>
        </div>
      ))}
    </div>
  );
}

function ModificationsList({ companies }: { companies: PendingUpdateCompanyItem[] }): JSX.Element {
  if (companies.length === 0) {
    return (
      <EmptyState icon="edit_note" title="Aucune modification en attente" subtitle="Toutes les modifications ont été traitées." />
    );
  }
  return (
    <div className="space-y-3">
      {companies.map((c) => (
        <div key={c.id} className="bg-white border border-surface-border rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#D97706]/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#D97706]" style={{ fontSize: 22 }}>edit_note</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-heading font-semibold text-[14px] text-ink-primary leading-tight">{c.displayName}</div>
            <div className="flex items-center gap-2 mt-1 text-[12px] text-ink-secondary">
              <span>{c.fieldsCount} champ{c.fieldsCount !== 1 ? "s" : ""} modifié{c.fieldsCount !== 1 ? "s" : ""}</span>
              <span>·</span>
              <span>Soumis le {new Date(c.submittedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          </div>
          <Link
            href={`/admin/validation/comptes/${c.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#5C2D91] hover:bg-[#4A2377] rounded transition-colors shrink-0"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
            Examiner
          </Link>
        </div>
      ))}
    </div>
  );
}

function ProfilesList({ profiles }: { profiles: PendingProfileItem[] }): JSX.Element {
  const kindLabel = (kind: string): string =>
    kind === "brandup" ? "BrandUP" : kind === "traceup" ? "TraceUP" : "LinkUP";
  const kindColor = (kind: string): string =>
    kind === "brandup" ? "#0078D4" : kind === "traceup" ? "#7C3AED" : "#242424";

  if (profiles.length === 0) {
    return (
      <EmptyState icon="verified" title="Aucun profil en attente" subtitle="Tous les profils ont été traités." />
    );
  }
  return (
    <div className="space-y-3">
      {profiles.map((p) => (
        <div key={p.id} className="bg-white border border-surface-border rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${kindColor(p.kind)}15` }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: kindColor(p.kind) }}>
              {p.kind === "brandup" ? "storefront" : p.kind === "traceup" ? "play_circle" : "qr_code_2"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-heading font-semibold text-[14px] text-ink-primary leading-tight">{p.companyName}</div>
            <div className="flex items-center gap-2 mt-1 text-[12px] text-ink-secondary">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${kindColor(p.kind)}15`, color: kindColor(p.kind) }}>
                {kindLabel(p.kind)}
              </span>
              <span>Soumis le {new Date(p.submittedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
          </div>
          <Link
            href={`/admin/validation/profiles/${p.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#5C2D91] hover:bg-[#4A2377] rounded transition-colors shrink-0"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
            Examiner
          </Link>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RseList({ receipts }: { receipts: any[] }): JSX.Element {
  if (receipts.length === 0) {
    return (
      <EmptyState icon="volunteer_activism" title="Aucun reçu en attente" subtitle="Tous les reçus RSE ont été traités." />
    );
  }
  return (
    <div className="space-y-3">
      {receipts.map((r) => (
        <div key={r.id} className="bg-white border border-surface-border rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined icon-fill text-[#C5A059]" style={{ fontSize: 22 }}>volunteer_activism</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-heading font-semibold text-[14px] text-ink-primary leading-tight">{r.companyName}</div>
            <div className="flex items-center gap-2 mt-1 text-[12px] text-ink-secondary flex-wrap">
              <span>{r.associationName}</span>
              <span>·</span>
              <span className="font-semibold">{r.amount} DT</span>
              <span>·</span>
              <span>Don du {new Date(r.donationDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          </div>
          <Link
            href={`/admin/validation/rse/${r.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-[9px] text-[13px] font-semibold text-white bg-[#5C2D91] hover:bg-[#4A2377] rounded transition-colors shrink-0"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
            Examiner
          </Link>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }): JSX.Element {
  return (
    <div className="bg-white border border-surface-border rounded-lg py-16 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-muted mb-4">
        <span className="material-symbols-outlined text-ink-tertiary" style={{ fontSize: 32 }}>{icon}</span>
      </div>
      <h2 className="font-heading font-bold text-[16px] text-ink-primary mb-1">{title}</h2>
      <p className="text-[13px] text-ink-secondary">{subtitle}</p>
    </div>
  );
}
