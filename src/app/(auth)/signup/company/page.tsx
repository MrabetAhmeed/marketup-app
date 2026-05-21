"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import useSWR from "swr";
import AuthErrorBanner from "@/components/shared/AuthErrorBanner";
import AuthLeftPanel from "@/components/shared/AuthLeftPanel";
import { useToast } from "@/components/shared/Toast";
import { getAuthErrorMessage } from "@/lib/auth-error-messages";
import type { ErrorMapEntry } from "@/lib/auth-error-messages";
import { SignupCompanySchema } from "@/schemas/auth.schema";
import type { SignupCompanyInput } from "@/schemas/auth.schema";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SignupCompanyPage(): JSX.Element {
  return (
    <Suspense>
      <SignupCompanyContent />
    </Suspense>
  );
}

function SignupCompanyContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetType = searchParams.get("type")?.toUpperCase();
  const { showToast } = useToast();
  const [errorEntry, setErrorEntry] = useState<ErrorMapEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupCompanyInput>({
    resolver: zodResolver(SignupCompanySchema),
    defaultValues: {
      type: presetType === "B2C" ? "B2C" : "B2B",
    },
  });

  const marketType = watch("type");

  // Fetch sectors based on market type
  const sectorUrl = marketType === "B2C" ? "/api/v1/resources/categories-b2c" : "/api/v1/resources/sectors-b2b";
  const { data: sectors } = useSWR<{ slug: string; name: string }[]>(sectorUrl, fetcher);

  // Fetch gouvernorats
  const { data: gouvernorats } = useSWR<{ slug: string; name: string }[]>("/api/v1/resources/gouvernorats", fetcher);

  // Reset sector when market type changes
  useEffect(() => {
    setValue("sectorId", "");
  }, [marketType, setValue]);

  async function handleDocUpload(file: File): Promise<void> {
    setDocFile(file);
    setDocUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/v1/public/signup-document", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error?.message || "Erreur lors de l'upload du document");
        setDocFile(null);
        return;
      }
      setDocUrl(json.url as string);
      setValue("identityDocumentUrl", json.url as string);
    } catch {
      showToast("Erreur, veuillez réessayer");
      setDocFile(null);
    } finally {
      setDocUploading(false);
    }
  }

  const onSubmit = async (data: SignupCompanyInput) => {
    setErrorEntry(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/signup/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, identityDocumentUrl: docUrl }),
      });
      const json = await res.json();
      if (!res.ok) {
        const code = json.error?.code || "SERVER_ERROR";
        const entry = getAuthErrorMessage(code);
        if (entry.presentation === "toast") {
          showToast(entry.message);
        } else {
          setErrorEntry(entry);
        }
        return;
      }
      // Store userId in sessionStorage for step 2
      sessionStorage.setItem("signupUserId", json.userId);
      sessionStorage.setItem("signupEmail", data.accountEmail);
      router.push("/signup/user");
    } catch {
      showToast(getAuthErrorMessage("NETWORK_ERROR").message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AuthLeftPanel step={1} completedSteps={[]} />

      <section className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
          <Link href="/onboarding" className="text-xl font-bold tracking-tighter text-[#0078D4] font-headline">MARKET-UP</Link>
          <span className="text-xs text-[#616161]">Étape <span className="font-bold text-[#242424]">1</span> / 3</span>
        </div>
        {/* Mobile progress bar */}
        <div className="lg:hidden px-6 pt-4">
          <div className="h-[3px] bg-[#E0E0E0] rounded-sm overflow-hidden">
            <div className="h-full bg-[#0078D4] transition-[width] duration-300" style={{ width: "33.33%" }} />
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-start justify-center px-6 md:px-12 py-8 md:py-12 lg:py-16">
          <div className="w-full max-w-2xl">
            <header className="mb-10">
              <span className="inline-block px-2.5 py-1 bg-[#EFF6FC] text-[#0078D4] text-[10px] font-bold uppercase tracking-widest rounded mb-4">Étape 1 sur 3</span>
              <h1 className="text-3xl md:text-[32px] font-semibold text-[#242424] mb-3 tracking-tight">Votre entreprise</h1>
              <p className="text-[#616161] text-base">Renseignez les informations légales pour créer votre compte MARKET-UP.</p>
            </header>

            {errorEntry && <AuthErrorBanner entry={errorEntry} />}

            {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
            <form onSubmit={handleSubmit(
              (data) => {
                if (process.env.NODE_ENV === "development") {
                  console.log("[signup/company] submitting:", data);
                }
                return onSubmit(data as SignupCompanyInput);
              },
              (validationErrors) => {
                if (process.env.NODE_ENV === "development") {
                  console.warn("[signup/company] validation errors:", validationErrors);
                }
              },
            )} className="space-y-6">
              {/* Market type */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 after:content-['*'] after:text-[#D13438] after:ml-1">Type de marché</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(["B2B", "B2C"] as const).map((t) => (
                    <label key={t} className="relative cursor-pointer block">
                      <input type="radio" value={t} {...register("type")} className="sr-only peer" />
                      <div className={`rounded-lg p-4 flex items-start gap-3 bg-white border transition-[border-color,background] duration-150 ${marketType === t ? "border-[#0078D4] bg-[#EFF6FC] shadow-[0_0_0_1px_#0078D4]" : "border-[#E0E0E0] hover:border-[#D1D1D1]"}`}>
                        <span className={`material-symbols-outlined text-xl shrink-0 ${marketType === t ? "text-[#0078D4]" : "text-[#616161]"}`}>
                          {t === "B2B" ? "business_center" : "storefront"}
                        </span>
                        <div>
                          <div className="font-semibold text-sm text-[#242424]">{t === "B2B" ? "B2B · Professionnel" : "B2C · Grand public"}</div>
                          <div className="text-xs text-[#616161] mt-0.5 leading-snug">{t === "B2B" ? "Fournisseurs, partenaires, services industriels" : "Commerces, artisans, consommateurs"}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Company name */}
              <div>
                <label htmlFor="displayName" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 after:content-['*'] after:text-[#D13438] after:ml-1">Nom de l&apos;entreprise</label>
                <input id="displayName" {...register("displayName")} className="w-full px-3.5 py-2.5 bg-white border border-[#D1D1D1] rounded text-sm text-[#242424] placeholder:text-[#8A8886] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC]" placeholder="Ex : TechnoFab Industries" />
                {errors.displayName && <p className="text-xs text-[#D13438] mt-1">{errors.displayName.message}</p>}
              </div>

              {/* Legal ID */}
              <div>
                <label htmlFor="legalId" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 after:content-['*'] after:text-[#D13438] after:ml-1">Identifiant légal</label>
                <input id="legalId" {...register("legalId")} className="w-full px-3.5 py-2.5 bg-white border border-[#D1D1D1] rounded text-sm text-[#242424] placeholder:text-[#8A8886] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC]" placeholder="Ex : 1234567 / A / 000" />
                <p className="text-xs text-[#8A8886] mt-1">Registre National des Entreprises (RNE) ou équivalent légal officiel</p>
                {errors.legalId && <p className="text-xs text-[#D13438] mt-1">{errors.legalId.message}</p>}
              </div>

              {/* Legal document upload */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5">Document légal officiel</label>
                <div className={`flex items-center gap-3.5 px-4 py-3.5 border border-dashed rounded-lg transition-colors ${docUrl ? "bg-[#F0FDF4] border-[#86EFAC]" : "bg-[#F5F5F5] border-[#D1D1D1] hover:border-[#0078D4]"}`}>
                  <div className="w-11 h-11 rounded-lg bg-white border border-[#E0E0E0] flex items-center justify-center shrink-0 text-[#0078D4]">
                    <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                      {docUrl ? "check_circle" : "description"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {docUrl ? (
                      <>
                        <div className="font-semibold text-[13px] text-[#166534] mb-0.5">{docFile?.name ?? "Document uploadé"}</div>
                        <div className="text-[11.5px] text-[#166534]">Document prêt</div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold text-[13px] text-[#242424] mb-0.5">Téléverser le document</div>
                        <div className="text-[11.5px] text-[#616161]">PDF, JPG ou PNG · 5 Mo max</div>
                      </>
                    )}
                  </div>
                  <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D1D1D1] rounded bg-white text-[#242424] text-xs font-semibold ${docUploading ? "cursor-wait opacity-60" : "cursor-pointer hover:bg-[#F5F5F5]"}`}>
                    {docUploading ? (
                      <span className="material-symbols-outlined animate-spin" style={{ fontSize: "14px" }}>progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>upload</span>
                    )}
                    {docUploading ? "Upload…" : docUrl ? "Remplacer" : "Choisir un fichier"}
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={docUploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocUpload(f); }}
                    />
                  </label>
                </div>
                <p className="text-xs text-[#8A8886] mt-1">Document officiel (RNE, patente...) — optionnel mais accélère la validation.</p>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="accountEmail" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 after:content-['*'] after:text-[#D13438] after:ml-1">Email professionnel</label>
                <input id="accountEmail" type="email" {...register("accountEmail")} className="w-full px-3.5 py-2.5 bg-white border border-[#D1D1D1] rounded text-sm text-[#242424] placeholder:text-[#8A8886] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC]" placeholder="contact@votre-entreprise.tn" />
                <p className="text-xs text-[#8A8886] mt-1">Cet email recevra vos notifications et le code de validation</p>
                {errors.accountEmail && <p className="text-xs text-[#D13438] mt-1">{errors.accountEmail.message}</p>}
              </div>

              {/* Sector */}
              <div>
                <label htmlFor="sectorId" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 after:content-['*'] after:text-[#D13438] after:ml-1">
                  {marketType === "B2C" ? "Catégorie d'activité" : "Secteur d'activité"}
                </label>
                <select
                  id="sectorId"
                  {...register("sectorId")}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D1D1D1] rounded text-sm text-[#242424] appearance-none focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
                  style={{ backgroundImage: `url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23616161' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, paddingRight: "40px" }}
                >
                  <option value="">— Sélectionner —</option>
                  {sectors?.map((s) => (
                    <option key={s.slug} value={s.slug}>{s.name}</option>
                  ))}
                </select>
                <p className="text-xs text-[#8A8886] mt-1">
                  {marketType === "B2C" ? "Choisissez la catégorie qui décrit le mieux votre offre" : "Choisissez le secteur qui correspond le mieux à votre activité"}
                </p>
                {errors.sectorId && <p className="text-xs text-[#D13438] mt-1">{errors.sectorId.message}</p>}
              </div>

              {/* Country + Gouvernorat */}
              {/* V1: country hardcoded to "TN" server-side (canon).
                  To extend to other countries in V2:
                    1. Add `country` to SignupCompanySchema
                    2. Create GET /api/v1/resources/countries endpoint
                    3. Remove the hardcoded "TN" in signupCompany() service
                    4. Enable the dropdown in the UI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="country" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 after:content-['*'] after:text-[#D13438] after:ml-1">Pays</label>
                  <select
                    id="country"
                    defaultValue="TN"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D1D1D1] rounded text-sm text-[#242424] appearance-none focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC]"
                    style={{ backgroundImage: `url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23616161' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, paddingRight: "40px", backgroundPosition: "right 12px center", backgroundRepeat: "no-repeat", backgroundSize: "16px" }}
                  >
                    <option value="TN">🇹🇳 Tunisie</option>
                    <option value="FR" disabled>🇫🇷 France — Bientôt disponible</option>
                    <option value="MA" disabled>🇲🇦 Maroc — Bientôt disponible</option>
                    <option value="DZ" disabled>🇩🇿 Algérie — Bientôt disponible</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="gouvernorat" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 after:content-['*'] after:text-[#D13438] after:ml-1">Gouvernorat</label>
                  <select
                    id="gouvernorat"
                    {...register("gouvernorat")}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D1D1D1] rounded text-sm text-[#242424] appearance-none focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC]"
                    style={{ backgroundImage: `url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23616161' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, paddingRight: "40px", backgroundPosition: "right 12px center", backgroundRepeat: "no-repeat", backgroundSize: "16px" }}
                  >
                    <option value="">— Sélectionner —</option>
                    {gouvernorats?.map((g) => (
                      <option key={g.slug} value={g.slug}>{g.name}</option>
                    ))}
                  </select>
                  {errors.gouvernorat && <p className="text-xs text-[#D13438] mt-1">{errors.gouvernorat.message}</p>}
                </div>
              </div>

              {/* Ville + Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="ville" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5 after:content-['*'] after:text-[#D13438] after:ml-1">Ville</label>
                  <input id="ville" {...register("ville")} className="w-full px-3.5 py-2.5 bg-white border border-[#D1D1D1] rounded text-sm text-[#242424] placeholder:text-[#8A8886] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC]" placeholder="Ex : Tunis" />
                  {errors.ville && <p className="text-xs text-[#D13438] mt-1">{errors.ville.message}</p>}
                </div>
                <div>
                  <label htmlFor="address" className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#616161] mb-1.5">Adresse du siège</label>
                  <input id="address" {...register("address")} className="w-full px-3.5 py-2.5 bg-white border border-[#D1D1D1] rounded text-sm text-[#242424] placeholder:text-[#8A8886] focus:border-[#0078D4] focus:outline-none focus:ring-2 focus:ring-[#EFF6FC]" placeholder="Ex : 12 rue de Syrie" />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-[#E0E0E0]">
                <Link href="/onboarding" className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-semibold text-[#0078D4] hover:bg-[#EFF6FC] rounded transition-colors">
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Retour
                </Link>
                <button type="submit" disabled={submitting} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white text-sm font-semibold rounded transition-colors disabled:bg-[#D1D1D1] disabled:cursor-not-allowed">
                  {submitting ? "Envoi..." : "Continuer"}
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>

              {/* Login link */}
              <div className="text-center text-sm text-[#616161] pt-2">
                Déjà inscrit ? <Link href="/login" className="text-[#0078D4] font-semibold hover:underline">Se connecter</Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
