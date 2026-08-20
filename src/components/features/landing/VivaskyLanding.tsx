"use client";

/**
 * Portail vivasky.media — port du mockup `index.html` (landing racine).
 *
 * Dépendance tailwind.config.ts (theme.extend) requise pour `animate-breathe` :
 *   keyframes: {
 *     breathe: {
 *       "0%, 100%": { filter: "grayscale(100%) brightness(0.7)" },
 *       "50%": { filter: "grayscale(0%) brightness(1)" },
 *     },
 *   },
 *   animation: { breathe: "breathe 8s ease-in-out infinite" },
 */

import { useRef } from "react";
import Link from "next/link";
import type { MouseEvent } from "react";

type EcosystemCard = {
  readonly title: string;
  readonly description: string;
  /** Nom d'icône Material Symbols (canon projet — remplace Phosphor du mockup). */
  readonly icon: string;
  readonly imageUrl: string;
  /** Route interne ("/brandup") ou placeholder "#". */
  readonly href: string;
  /** Spans + min-heights (équivalent des règles nth-child du mockup). */
  readonly layoutClass: string;
  /** Décalage du cycle colorBreathe pour un rendu organique. */
  readonly breatheDelay?: string;
};

const ECOSYSTEM_CARDS: readonly EcosystemCard[] = [
  // {
  //   title: "SkyMind",
  //   description: "Progressez. Écrivez.",
  //   icon: "edit",
  //   imageUrl:
  //     "https://images.unsplash.com/photo-1607551848581-7ee851bf978b?q=80&w=1174&auto=format&fit=crop",
  //   href: "#",
  //   layoutClass: "min-h-[280px] sm:col-span-2",
  // },
  // {
  //   title: "WikiLife",
  //   description: "Connaissance vivante pour le quotidien.",
  //   icon: "public",
  //   imageUrl:
  //     "https://plus.unsplash.com/premium_photo-1723619021737-df1d775eccc8?q=80&w=1169&auto=format&fit=crop",
  //   href: "#",
  //   layoutClass: "min-h-[240px]",
  //   breatheDelay: "2s",
  // },
  // {
  //   title: "SkyBook",
  //   description: "Lire à ciel ouvert.",
  //   icon: "menu_book",
  //   imageUrl:
  //     "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop",
  //   href: "#",
  //   layoutClass: "min-h-[240px]",
  //   breatheDelay: "4s",
  // },
  {
    title: "TraceUP",
    description: "Média vidéo, entreprises traçables.",
    icon: "videocam",
    imageUrl:
      "https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?q=80&w=800&auto=format&fit=crop",
    href: "/onboarding?product=traceup",
    layoutClass: "min-h-[240px] lg:row-span-2 lg:min-h-[500px]",
    breatheDelay: "2s",
  },
  {
    title: "LinkUP",
    description: "Connectez tout, simplement.",
    icon: "account_tree",
    imageUrl:
      "https://plus.unsplash.com/premium_photo-1764691489695-56c848f680dd?q=80&w=1460&auto=format&fit=crop",
    href: "/onboarding?product=linkup",
    layoutClass: "min-h-[240px]",
    breatheDelay: "6s",
  },
  {
    title: "BrandUP",
    description: "La vitrine officielle du sourcing.",
    icon: "storefront",
    imageUrl:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop",
    href: "/onboarding?product=brandup",
    layoutClass: "min-h-[240px]",
    breatheDelay: "4s",
  },
  // {
  //   title: "SkyERP",
  //   description: "Manager online. Pilotage visionnaire.",
  //   icon: "trending_up",
  //   imageUrl:
  //     "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
  //   href: "#",
  //   layoutClass: "min-h-[240px]",
  // },
  // {
  //   title: "SkyQR",
  //   description: "Générateur de QR code intelligent.",
  //   icon: "qr_code_2",
  //   imageUrl:
  //     "https://images.unsplash.com/photo-1550482781-48d477e61c72?q=80&w=1170&auto=format&fit=crop",
  //   href: "#",
  //   layoutClass: "min-h-[240px]",
  //   breatheDelay: "2s",
  // },
];

const CARD_CLASS = [
  "group relative overflow-hidden rounded-2xl bg-black no-underline",
  "shadow-[0_10px_30px_rgba(0,0,0,0.08)]",
  "transition-[transform,box-shadow] duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)]",
  "hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)]",
  // Spotlight qui suit la souris (::before du mockup, piloté par --mouse-x / --mouse-y)
  "before:content-[''] before:pointer-events-none before:absolute before:z-[3]",
  "before:left-[var(--mouse-x,0)] before:top-[var(--mouse-y,0)]",
  "before:h-[400px] before:w-[400px] before:-translate-x-1/2 before:-translate-y-1/2",
  "before:bg-[radial-gradient(circle,rgba(255,255,255,0.2)_0%,transparent_60%)]",
  "before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
].join(" ");

const CARD_BG_CLASS = [
  "absolute inset-0 z-[1] bg-cover bg-center",
  "grayscale brightness-[0.70] animate-breathe",
  "[transition:transform_0.8s_cubic-bezier(0.25,1,0.5,1),filter_0.6s_ease]",
  "group-hover:animate-none group-hover:grayscale-0 group-hover:brightness-100 group-hover:scale-[1.08]",
].join(" ");

const CARD_OVERLAY_CLASS = [
  "absolute inset-0 z-[2] transition-all duration-500",
  "bg-[linear-gradient(to_top,rgba(15,23,42,0.85)_0%,transparent_60%)]",
  "group-hover:bg-[linear-gradient(to_top,rgba(15,23,42,0.95)_0%,rgba(15,23,42,0.2)_60%,transparent_100%)]",
].join(" ");

const BTN_CLASS =
  "cursor-pointer rounded-md border px-4 py-1.5 text-[0.8rem] font-medium shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]";
const BTN_SHARE_CLASS = `${BTN_CLASS} border-black/[0.08] bg-white text-slate-900`;
const BTN_PRIMARY_CLASS = `${BTN_CLASS} border-slate-900 bg-slate-900 text-white hover:bg-slate-800`;

export function VivaskyLanding(): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openPitch = (): void => {
    dialogRef.current?.showModal();
  };

  const closePitch = (): void => {
    dialogRef.current?.close();
  };

  const handleShare = (): void => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      void navigator.share({ title: "Vivasky", url }).catch(() => undefined);
    } else {
      // Le mockup affichait « Lien copié » sans copier — ici on copie réellement.
      void navigator.clipboard?.writeText(url).catch(() => undefined);
      window.alert(`Lien copié : ${url}`);
    }
  };

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
                src="https://vivasky.media/images/logo_gray_rectangle_name.png"
                alt="Vivasky Logo"
                className="block h-[70%] w-[70%]"
              />
            </a>
          </header>

          <div className="mt-5">
            <h1 className="mb-5 text-[clamp(2.5rem,4vw,4.5rem)] font-extrabold leading-[1.05] tracking-[-0.02em] text-slate-900">
              E-motion of life
            </h1>
            <p className="max-w-[400px] text-[clamp(1rem,1.5vw,1.15rem)] leading-[1.6] text-slate-600">
              L’écosystème de l’action responsable : <b>penser</b>, <b>créer</b> et{" "}
              <b>piloter</b> au quotidien.
            </p>
          </div>

          <footer className="mt-auto hidden items-center justify-between text-[0.8rem] text-slate-600 lg:flex">
            <FooterInner onShare={handleShare} onPitch={openPitch} />
          </footer>
        </div>

        {/* Colonne droite — grille bento */}
        <div className="grid grid-cols-1 gap-4 pb-10 sm:grid-cols-2">
          {ECOSYSTEM_CARDS.map((card) => {
            const isInternal = card.href.startsWith("/");
            const cardClassName = `${CARD_CLASS} ${card.layoutClass}`;
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
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined self-end text-[28px] text-white/70 transition-all duration-[400ms] group-hover:rotate-[5deg] group-hover:scale-110 group-hover:text-white"
                  >
                    {card.icon}
                  </span>
                  <div className="mt-auto">
                    <div className="mb-1.5 text-xl font-bold">{card.title}</div>
                    <div className="text-[0.85rem] leading-[1.4] text-white/80">
                      {card.description}
                    </div>
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
        className="m-auto w-[90%] max-w-[500px] scale-95 rounded-2xl border border-black/[0.08] bg-white p-0 text-slate-900 opacity-0 shadow-[0_25px_50px_rgba(0,0,0,0.15)] transition-[opacity,transform] duration-300 open:scale-100 open:opacity-100 [&::backdrop]:bg-black/40 [&::backdrop]:backdrop-blur-[3px]"
      >
        <div className="p-8 text-justify text-sm">
          <div className="mb-6 flex items-center justify-between border-b border-black/5 pb-4">
            <h2 className="text-[21px] font-bold">Vivasky : Votre écosystème réflexe.</h2>
            <button
              type="button"
              onClick={closePitch}
              aria-label="Fermer"
              className="cursor-pointer text-2xl text-slate-600 transition-colors hover:text-slate-900"
            >
              &times;
            </button>
          </div>

          <p>
            <em>
              <b>Touch your screens, get your needs.</b>
            </em>
          </p>
          <p className="mt-4">
            On ouvre un onglet, puis dix, on scrolle des heures un fil d’actualité saturé, et
            nos données sont aspirées. Le web moderne nous éparpille. Internet dicte notre
            rythme.
          </p>
          <p className="mt-4">
            <b>
              Vivasky est né pour inverser ce rapport de force. Pour réinventer notre manière
              de vivre avec le numérique.
            </b>
          </p>
          <p className="mt-4">
            Imaginez une grille unique, épurée, sous vos yeux, où votre esprit s’apaise. Un
            besoin émerge ? Un simple effleurement d’écran y répond instantanément. En un
            clic, vous reprenez les commandes de votre journée pour <b>penser</b> le savoir,{" "}
            <b>créer</b> librement et <b>piloter</b> vos affaires.
          </p>
          <p className="mt-4">
            Pour que chacun puisse vivre mieux avec le numérique, cet espace est entièrement
            gratuit. Pas d’abonnement, pas de piège. Vivasky se finance exclusivement par une
            publicité d’un genre nouveau : responsable, discrète et non intrusive, qui
            respecte enfin votre attention.
          </p>
          <p className="mt-4">
            Vivasky, c’est l’écosystème de l’action responsable. L’instinct de l’efficacité,
            l’éthique en plus.
          </p>

          <p className="mt-5 border-t border-black/10 pt-[15px] text-center italic text-[#666]">
            &quot;E-motion of Life&quot; — Une technologie qui bat au rythme de la vie.
          </p>
        </div>
      </dialog>
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
