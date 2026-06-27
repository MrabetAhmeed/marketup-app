"use client";

import { FaLayerGroup, FaCirclePlay, FaGlobe, FaWhatsapp, FaYoutube, FaFacebook, FaInstagram, FaLinkedin, FaXTwitter, FaLocationDot } from "react-icons/fa6";
import type { IconType } from "react-icons";

interface Social {
  platform: string;
  url: string | null;
}

interface ServicesGridProps {
  slug: string;
  socials: Social[];
  siblingProfiles: { brandup: boolean; traceup: boolean };
  companyWhatsapp?: string | null;
  companyPhone?: string | null;
  companyAddress?: string | null;
  companyVille?: string | null;
  companyGouvernoratName?: string | null;
}

interface ServiceDef {
  key: string;
  label: string;
  icon: IconType;
  href: string | null;
  external: boolean;
}

function getWhatsAppLink(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

function getMapsLink(address: string | null, ville: string | null, gouvernorat: string | null): string | null {
  const parts = [address, ville, gouvernorat].filter(Boolean).join(", ");
  if (!parts) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts)}`;
}

export default function ServicesGrid({ slug, socials, siblingProfiles, companyWhatsapp, companyPhone, companyAddress, companyVille, companyGouvernoratName }: ServicesGridProps): JSX.Element {
  const socialUrl = (platform: string): string | null => {
    const s = socials.find((x) => x.platform === platform);
    return s?.url ?? null;
  };

  const services: ServiceDef[] = [
    { key: "brandup", label: "BrandUP", icon: FaLayerGroup, href: siblingProfiles.brandup ? `/brandup/${slug}` : null, external: false },
    { key: "traceup", label: "TraceUP", icon: FaCirclePlay, href: siblingProfiles.traceup ? `/traceup/${slug}` : null, external: false },
    { key: "website", label: "Site Web", icon: FaGlobe, href: socialUrl("website"), external: true },
    { key: "whatsapp", label: "WhatsApp", icon: FaWhatsapp, href: getWhatsAppLink(companyWhatsapp ?? companyPhone ?? null), external: true },
    { key: "youtube", label: "YouTube", icon: FaYoutube, href: socialUrl("youtube"), external: true },
    { key: "facebook", label: "Facebook", icon: FaFacebook, href: socialUrl("facebook"), external: true },
    { key: "instagram", label: "Instagram", icon: FaInstagram, href: socialUrl("instagram"), external: true },
    { key: "linkedin", label: "LinkedIn", icon: FaLinkedin, href: socialUrl("linkedin"), external: true },
    { key: "twitter", label: "Twitter", icon: FaXTwitter, href: socialUrl("twitter") ?? socialUrl("x"), external: true },
    { key: "maps", label: "Maps", icon: FaLocationDot, href: getMapsLink(companyAddress ?? null, companyVille ?? null, companyGouvernoratName ?? null), external: true },
  ].filter((s) => s.href != null);

  if (services.length === 0) return <></>;

  return (
    <div className="mb-20 mx-auto max-w-5xl">
      <div className="text-center mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface">Canaux &amp; Services Officiels</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {services.map((s) => {
          const Icon = s.icon;
          const Tag = s.external ? "a" : "a";
          const extraProps = s.external ? { target: "_blank", rel: "noopener" } : {};

          return (
            <Tag
              key={s.key}
              href={s.href!}
              {...extraProps}
              className="aspect-square bg-white flex flex-col items-center justify-center text-center group p-2 cursor-pointer transition-all duration-200"
              style={{
                border: "1px solid #E0E0E0",
                borderRadius: 14,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "#C5A059";
                el.style.transform = "translateY(-4px)";
                el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "#E0E0E0";
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "none";
              }}
            >
              <div className="flex items-center justify-center mb-2 w-8 h-8">
                <Icon className="text-on-surface-variant group-hover:text-primary transition-colors" style={{ fontSize: "2em" }} />
              </div>
              <span className="font-bold text-on-surface text-[11px]">{s.label}</span>
            </Tag>
          );
        })}
      </div>
    </div>
  );
}
