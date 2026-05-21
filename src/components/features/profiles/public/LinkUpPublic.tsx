import ProfileHero from "./ProfileHero";
import ServicesGrid from "./ServicesGrid";
import RseSection from "./RseSection";
import CrossLinks from "./CrossLinks";
import type { PublicLinkUpProfile } from "@/services/public-profile.service";

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
      <div className="max-w-[1280px] mx-auto px-6 py-8">
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
          gouvernoratName={c.gouvernoratName}
          ville={c.ville}
          rseBadgeStatus={c.rseBadgeStatus}
        />

        <ServicesGrid
          slug={c.slug}
          contactCard={data.contactCard}
          socials={data.socials}
          siblingProfiles={data.siblingProfiles}
          companyWhatsapp={c.whatsapp}
          companyPhone={c.phone}
        />

        <RseSection receipts={data.rseReceipts} />

        <CrossLinks current="linkup" />
      </div>
    </div>
  );
}
