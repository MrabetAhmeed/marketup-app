"use client";

/**
 * Portail vivasky.media — port du mockup `index.html` (landing racine).
 *
 * Animation colorBreathe définie dans globals.css (.landing-card-bg).
 */

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import type { MouseEvent } from "react";

type EcosystemCard = {
  readonly title: string;
  readonly badge: string;
  readonly description: string;
  /** Nom d'icône Material Symbols. */
  readonly icon: string;
  readonly imageUrl: string;
  /** Route interne ("/brandup") ou URL externe. */
  readonly href: string;
  /** Décalage du cycle colorBreathe pour un rendu organique. */
  readonly breatheDelay?: string;
  /** Sous-modules affichés en chips (LifeUP uniquement). */
  readonly subModules?: readonly string[];
};

const ECOSYSTEM_CARDS: readonly EcosystemCard[] = [
  {
    title: "BrandUP",
    badge: "Sourcing & Marque",
    description: "La référence des marques en Tunisie.",
    icon: "storefront",
    imageUrl:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop",
    href: "/onboarding?product=brandup",
  },
  {
    title: "TraceUP",
    badge: "Média & Authentification",
    description: "Le flux vidéo de l'économie tunisienne.",
    icon: "videocam",
    imageUrl:
      "https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?q=80&w=800&auto=format&fit=crop",
    href: "/onboarding?product=traceup",
    breatheDelay: "2s",
  },
  {
    title: "LinkUP",
    badge: "Connexion & Hub",
    description: "L'accès direct à l'économie tunisienne.",
    icon: "account_tree",
    imageUrl:
      "https://plus.unsplash.com/premium_photo-1764691489695-56c848f680dd?q=80&w=1460&auto=format&fit=crop",
    href: "/onboarding?product=linkup",
    breatheDelay: "4s",
  },
  {
    title: "LifeUP",
    badge: "Quotidien & Pilotage",
    description: "Le web responsable et réfléchi.",
    icon: "auto_awesome",
    imageUrl:
      "https://images.unsplash.com/photo-1607551848581-7ee851bf978b?q=80&w=1174&auto=format&fit=crop",
    href: "https://lifeup.vivasky.media/",
    breatheDelay: "6s",
    subModules: ["SkyMind", "SkyBook", "SkyNova", "SkyVibe", "WikiLife"],
  },
];

const CARD_CLASS = [
  "group relative overflow-hidden rounded-2xl bg-black no-underline",
  "shadow-[0_10px_30px_rgba(0,0,0,0.08)]",
  "transition-[transform,box-shadow] duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)]",
  "hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.25)]",
  // Spotlight qui suit la souris (::before du mockup, piloté par --mouse-x / --mouse-y)
  "before:content-[''] before:pointer-events-none before:absolute before:z-[3]",
  "before:left-[var(--mouse-x,0)] before:top-[var(--mouse-y,0)]",
  "before:h-[400px] before:w-[400px] before:-translate-x-1/2 before:-translate-y-1/2",
  "before:bg-[radial-gradient(circle,rgba(255,255,255,0.2)_0%,transparent_60%)]",
  "before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
].join(" ");

const CARD_BG_CLASS = [
  "absolute inset-0 z-[1] bg-cover bg-center",
  "landing-card-bg",
].join(" ");

const CARD_OVERLAY_CLASS = [
  "absolute inset-0 z-[2] transition-all duration-500",
  "bg-[linear-gradient(to_top,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.3)_60%,transparent_100%)]",
  "group-hover:bg-[linear-gradient(to_top,rgba(15,23,42,0.95)_0%,rgba(15,23,42,0.4)_60%,transparent_100%)]",
].join(" ");

const BTN_CLASS =
  "cursor-pointer rounded-lg border px-[18px] py-2 text-[0.85rem] font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]";
const BTN_SHARE_CLASS = `${BTN_CLASS} border-black/[0.08] bg-white text-slate-900`;
const BTN_PRIMARY_CLASS = `${BTN_CLASS} border-slate-900 bg-[#002D6B] text-white hover:bg-slate-800`;

export function VivaskyLanding(): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [showCopied, setShowCopied] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openPitch = (): void => {
    dialogRef.current?.showModal();
  };

  const closePitch = (): void => {
    dialogRef.current?.close();
  };

  const handleShare = useCallback((): void => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      void navigator.share({ title: "Vivasky", url }).catch(() => undefined);
    } else {
      void navigator.clipboard?.writeText(url).catch(() => undefined);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setShowCopied(true);
      toastTimer.current = setTimeout(() => setShowCopied(false), 2500);
    }
  }, []);

  const handleCardMouseMove = (event: MouseEvent<HTMLAnchorElement>): void => {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
  };

  return (
    <div className="relative isolate min-h-screen text-slate-900 antialiased">
      {/* Material Symbols — retirer ce <link> s'il est déjà chargé par le layout racine */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />

      {/* Fond lumineux + grille de points (ambient-bg) */}
      <div className="fixed left-0 top-0 z-[-2] h-screen w-screen bg-[radial-gradient(circle_at_0%_0%,#ffffff_0%,#e2e8f0_100%)] after:absolute after:inset-0 after:content-[''] after:bg-[radial-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] after:[background-size:32px_32px]" />

      <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 gap-[30px] p-5 lg:grid-cols-[1fr_1.3fr] lg:gap-20 lg:p-10">
        {/* Colonne gauche (sticky desktop) */}
        <div className="flex flex-col lg:sticky lg:top-10 lg:h-[calc(100vh-80px)]">
          <header className="mb-auto flex w-full items-center justify-between pt-5">
            <a href="#">
              <img
                src="https://vivasky.media/images/logo_vivaskymedia.png"
                alt="Vivasky Logo"
                className="block h-[70%] w-[70%]"
              />
            </a>
          </header>

          <div className="mt-5">
            <h1 className="mb-5 text-[clamp(2.5rem,4vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#002D6B]">
              E-motion of life
            </h1>
            <p className="max-w-[440px] text-[clamp(1rem,1.5vw,1.15rem)] leading-[1.6] text-slate-600">
              La référence des entreprises et des talents. <br />Un écosystème responsable pour penser, créer et piloter au quotidien. <br />Vivasky : <b>j&apos;y suis, j&apos;existe, je vis souverain</b>.
            </p>
          </div>

          <footer className="mt-auto hidden items-center justify-between text-[0.8rem] text-slate-600 lg:flex">
            <FooterInner onShare={handleShare} onPitch={openPitch} />
          </footer>
        </div>

        {/* Colonne droite — grille bento */}
        <div className="grid grid-cols-1 gap-5 pb-10 sm:grid-cols-2">
          {ECOSYSTEM_CARDS.map((card) => {
            const isInternal = card.href.startsWith("/");
            const cardClassName = `${CARD_CLASS} min-h-[300px]`;
            const content = (
              <>
                <div
                  className={CARD_BG_CLASS}
                  style={{
                    backgroundImage: `url('${card.imageUrl}')`,
                    animationDelay: card.breatheDelay,
                  }}
                />
                <div className={CARD_OVERLAY_CLASS} />
                <div className="relative z-[4] flex h-full flex-col p-6 text-white">
                  <div className="flex w-full items-center justify-between">
                    <span className="self-start rounded-xl border border-white/20 bg-white/15 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[1.5px] backdrop-blur-sm">
                      {card.badge}
                    </span>
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-[28px] text-white/85 transition-all duration-[400ms] group-hover:rotate-[4deg] group-hover:scale-[1.15] group-hover:text-white"
                    >
                      {card.icon}
                    </span>
                  </div>
                  <div className="mt-auto">
                    <div className="mb-1.5 text-2xl font-extrabold tracking-tight">{card.title}</div>
                    <div className="text-[0.85rem] leading-[1.4] text-white/85">
                      {card.description}
                    </div>
                    {card.subModules && (
                      <div className="mt-3 flex flex-wrap gap-[5px]">
                        {card.subModules.map((mod) => (
                          <span
                            key={mod}
                            className="rounded-md border border-white/15 bg-white/[0.12] px-2 py-[3px] text-[0.7rem] font-semibold text-white backdrop-blur-[4px] transition-all duration-200 group-hover:border-white/35 group-hover:bg-white/[0.22]"
                          >
                            {mod}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            );

            return isInternal ? (
              <Link
                key={card.title}
                href={card.href}
                className={cardClassName}
                onMouseMove={handleCardMouseMove}
              >
                {content}
              </Link>
            ) : (
              <a
                key={card.title}
                href={card.href}
                className={cardClassName}
                onMouseMove={handleCardMouseMove}
              >
                {content}
              </a>
            );
          })}
        </div>

        {/* Footer mobile */}
        <footer className="mt-5 flex flex-col gap-[15px] border-t border-black/[0.08] pt-[30px] text-center text-[0.8rem] text-slate-600 lg:hidden [&>div]:justify-center">
          <FooterInner onShare={handleShare} onPitch={openPitch} />
        </footer>
      </div>

      {/* Modal pitch (« Découvrir ») */}
      <dialog
        ref={dialogRef}
        className="m-auto max-h-[85vh] w-[90%] max-w-[550px] scale-95 overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-0 text-slate-900 opacity-0 shadow-[0_25px_50px_rgba(0,0,0,0.2)] transition-[opacity,transform] duration-300 open:scale-100 open:opacity-100 [&::backdrop]:bg-black/40 [&::backdrop]:backdrop-blur-[4px]"
      >
        <div className="max-h-[85vh] overflow-y-auto p-8 text-justify text-sm leading-[1.6] scrollbar-thin">
          <div className="mb-5 flex items-center justify-between border-b border-black/[0.08] pb-4">
            <h2 className="text-lg font-bold">Vivasky : Votre écosystème réflexe.</h2>
            <button
              type="button"
              onClick={closePitch}
              aria-label="Fermer"
              className="cursor-pointer text-[26px] text-slate-600 transition-colors hover:text-slate-900"
            >
              &times;
            </button>
          </div>

          <p>
            <em>
              <b>Touch your screens, get your needs.</b>
            </em>
          </p>
          <br />
          <p>
            Le web moderne nous éparpille entre des dizaines d&apos;onglets, de publicités
            intrusives et de notifications incessantes.{" "}
            <b>
              Vivasky est conçu pour réinventer notre manière de vivre le numérique
            </b>{" "}
            en articulant votre quotidien autour de 4 piliers essentiels&nbsp;:
          </p>

          <div className="my-4 flex flex-col gap-3">
            <div className="rounded-[10px] border border-black/[0.08] bg-slate-50 px-4 py-3">
              <strong>BrandUP</strong> : La vitrine officielle et le sourcing éthique des marques.
            </div>
            <div className="rounded-[10px] border border-black/[0.08] bg-slate-50 px-4 py-3">
              <strong>TraceUP</strong> : Le média vidéo et la traçabilité authentique des acteurs.
            </div>
            <div className="rounded-[10px] border border-black/[0.08] bg-slate-50 px-4 py-3">
              <strong>LinkUP</strong> : La centralisation intelligente de vos liens et écosystèmes.
            </div>
            <div className="rounded-[10px] border border-black/[0.08] bg-slate-50 px-4 py-3">
              <strong>LifeUP</strong> : La suite du quotidien réunissant réflexion (SkyMind), savoir (WikiLife, SkyNova), lecture (SkyBook) et lifestyle (SkyVibe).
            </div>
          </div>

          <p>
            Entièrement gratuit, financé par une publicité responsable et non intrusive qui
            respecte votre attention.
          </p>

          <p className="mt-5 border-t border-black/10 pt-[15px] text-center italic text-[#666]">
            &quot;E-motion of Life&quot; — Une technologie qui bat au rythme de la vie.
          </p>
        </div>
      </dialog>

      {/* Toast « Lien copié » */}
      <div
        className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-lg border border-black/[0.08] bg-white px-5 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 ${showCopied ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
      >
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-[20px] text-emerald-600"
        >
          check_circle
        </span>
        <span className="text-sm font-medium text-slate-900">
          Lien copié avec succès
        </span>
      </div>
    </div>
  );
}

type FooterInnerProps = {
  readonly onShare: () => void;
  readonly onPitch: () => void;
};

function FooterInner({ onShare, onPitch }: FooterInnerProps): JSX.Element {
  return (
    <>
      <span>
        {new Date().getFullYear()} © vivasky.media —{" "}
        <a
          href="https://vivasky.media/cgu_cgv.html"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-slate-600 no-underline transition-colors hover:text-slate-900"
        >
          Conditions
        </a>
      </span>
      <div className="flex gap-2.5">
        <button type="button" onClick={onShare} className={BTN_SHARE_CLASS}>
          Partager
        </button>
        <button type="button" onClick={onPitch} className={BTN_PRIMARY_CLASS}>
          Découvrir
        </button>
      </div>
    </>
  );
}
