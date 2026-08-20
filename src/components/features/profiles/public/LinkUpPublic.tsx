import type { PublicLinkUpProfile } from "@/services/public-profile.service";
import ProfileHero from "./ProfileHero";
import ServicesGrid from "./ServicesGrid";
import RseSection from "./RseSection";
import CrossLinks from "./CrossLinks";

interface LinkUpPublicProps {
  data: PublicLinkUpProfile;
  embedded?: boolean;
}

export default function LinkUpPublic({ data, embedded }: LinkUpPublicProps): JSX.Element {
  const c = data.company;

  return (
    <div className={embedded ? "" : "pt-[64px] md:pt-[72px]"}>
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

        <ServicesGrid
          slug={c.slug}
          profileId={data.profileId}
          socials={data.socials}
          siblingProfiles={data.siblingProfiles}
          companyWhatsapp={c.whatsapp}
          companyPhone={c.phone}
          companyAddress={c.address}
          companyVille={c.ville}
          companyGouvernoratName={c.gouvernoratName}
          companyGpsPosition={c.gpsPosition}
        />

        <RseSection receipts={data.rseReceipts} />

        <CrossLinks current="linkup" slug={c.slug} visibleProfiles={data.siblingProfiles} />
      </div>
    </div>
  );
}
