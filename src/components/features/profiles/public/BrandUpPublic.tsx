import type { PublicBrandUpProfile } from "@/services/public-profile.service";
import ProfileHero from "./ProfileHero";
import ProjectGallery from "./ProjectGallery";
import RseSection from "./RseSection";
import CrossLinks from "./CrossLinks";

interface BrandUpPublicProps {
  data: PublicBrandUpProfile;
  embedded?: boolean; // true when rendered inside popup (no footer/header)
}

export default function BrandUpPublic({ data, embedded }: BrandUpPublicProps): JSX.Element {
  const c = data.company;

  return (
    <div className={embedded ? "" : "pt-[64px] md:pt-[72px]"}>
      {/* Boost banner — full width, outside max-w container */}
      {c.boosted && (
        <div className="w-full bg-[#EFF6FC] py-3 px-8 flex justify-center items-center border-b border-primary/10">
          <span className="text-primary font-semibold text-sm">Profil mis en avant</span>
        </div>
      )}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
        <ProfileHero
          logoUrl={c.logoUrl}
          displayName={c.displayName}
          legalId={c.legalId}
          sectorName={c.sectorName}
          type={c.type}
          phone={c.phone}
          whatsapp={c.whatsapp}
          email={c.contactEmail}
          address={c.address}
          postalCode={c.postalCode}
          gouvernoratName={c.gouvernoratName}
          ville={c.ville}
          rseBadgeStatus={c.rseBadgeStatus}
        />

        {/* Expertise & Vision */}
        {(data.pitch || data.about) && (
          <section className="relative bg-white rounded-2xl p-8 md:p-12 border border-outline-variant shadow-sm overflow-hidden mb-20">
            <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface mb-6 tracking-tight">Expertise &amp; Vision</h2>
            <div className="space-y-6 w-full">
              {data.pitch && <p className="text-on-surface-variant leading-[1.8] text-lg w-full text-justify font-semibold">{data.pitch}</p>}
              {data.about && <p className="text-on-surface-variant leading-[1.8] text-lg w-full text-justify">{data.about}</p>}
            </div>
          </section>
        )}

        {/* Projects gallery — gallery (user uploads) takes priority over projects (seed) */}
        <ProjectGallery projects={
          data.gallery.length > 0
            ? data.gallery.map((g) => ({ id: g.id, name: g.caption || "", image: g.url, description: "", order: g.order }))
            : data.projects
        } />

        {/* HIDDEN V1 — Certifications hidden for demo, reactivate V1.1 */}
        {false && data.certifications.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">Certifications &amp; Standards</h2>
              <div className="h-[1px] flex-grow bg-outline-variant" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {data.certifications.map((cert) => (
                <div key={cert.id} className="flex flex-col items-center p-6 bg-surface-container-low rounded-2xl text-center space-y-4">
                  {cert.image ? (
                    <img alt={cert.name} className="h-12 w-auto" src={cert.image} />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {cert.icon ?? "verified"}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-sm text-on-surface">{cert.name}</h4>
                    <p className="text-xs text-on-surface-variant">{cert.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RSE */}
        <RseSection receipts={data.rseReceipts} />

        {/* Cross-links */}
        <CrossLinks current="brandup" slug={c.slug} visibleProfiles={data.siblingProfiles} />
      </div>
    </div>
  );
}
