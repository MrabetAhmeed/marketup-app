"use client";

import { useState, useEffect, useCallback } from "react";

interface Project {
  id: string;
  name: string;
  image: string | null;
  description: string;
  order: number;
}

interface ProjectGalleryProps {
  projects: Project[];
}

export default function ProjectGallery({ projects }: ProjectGalleryProps): JSX.Element {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const showLightbox = useCallback((idx: number) => {
    setLightboxIdx(((idx % projects.length) + projects.length) % projects.length);
  }, [projects.length]);

  const hideLightbox = useCallback(() => setLightboxIdx(null), []);

  useEffect(() => {
    if (lightboxIdx === null) return;
    document.body.style.overflow = "hidden";
    function handleKey(e: KeyboardEvent): void {
      if (e.key === "Escape") hideLightbox();
      else if (e.key === "ArrowLeft") setLightboxIdx((prev) => prev !== null ? ((prev - 1 + projects.length) % projects.length) : null);
      else if (e.key === "ArrowRight") setLightboxIdx((prev) => prev !== null ? ((prev + 1) % projects.length) : null);
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [lightboxIdx, hideLightbox, projects.length]);

  if (projects.length === 0) return <></>;

  const main = projects[0]!;
  const sub = projects.slice(1, 3);
  const small = projects.slice(3, 9);

  return (
    <div className="mb-20">
      <div className="flex items-center gap-4 mb-10">
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">Catalogue de Production</h2>
        <div className="h-[1px] flex-grow bg-outline-variant" />
      </div>

      {/* Gallery grid */}
      <div className="flex flex-col md:grid md:grid-cols-12 gap-4 md:h-[700px]">
        {/* Main image */}
        <div className="md:col-span-5 md:order-2 h-[400px] md:h-full">
          <button
            type="button"
            onClick={() => showLightbox(0)}
            className="w-full h-full rounded-2xl overflow-hidden relative group cursor-pointer"
          >
            {main.image && (
              <img src={main.image} alt={main.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <h3 className="text-white font-bold text-lg">{main.name}</h3>
              <p className="text-white/70 text-sm mt-1 line-clamp-2">{main.description}</p>
            </div>
          </button>
        </div>

        {/* Sub images (left column) */}
        {sub.length > 0 && (
          <div className="md:col-span-3 md:order-1 flex flex-row md:flex-col gap-4 md:h-full">
            {sub.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => showLightbox(i + 1)}
                className="flex-1 rounded-2xl overflow-hidden relative group cursor-pointer h-[250px] md:h-auto"
              >
                {p.image && (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <p className="text-white font-bold text-sm">{p.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Small grid (right column) */}
        {small.length > 0 && (
          <div className="md:col-span-4 md:order-3 grid grid-cols-2 md:grid-cols-2 gap-4 md:h-full" style={{ gridAutoRows: "1fr" }}>
            {small.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => showLightbox(i + 3)}
                className="rounded-2xl overflow-hidden relative group cursor-pointer h-[150px] md:h-auto"
              >
                {p.image && (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) hideLightbox(); }}
        >
          <button onClick={hideLightbox} className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition" aria-label="Fermer">
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>close</span>
          </button>
          <button onClick={() => showLightbox(lightboxIdx - 1)} className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition" aria-label="Précédent">
            <span className="material-symbols-outlined" style={{ fontSize: 32 }}>chevron_left</span>
          </button>
          <button onClick={() => showLightbox(lightboxIdx + 1)} className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition" aria-label="Suivant">
            <span className="material-symbols-outlined" style={{ fontSize: 32 }}>chevron_right</span>
          </button>
          <div className="max-w-5xl w-full px-4">
            <div className="aspect-video bg-black/50 rounded-xl overflow-hidden flex items-center justify-center">
              {projects[lightboxIdx]?.image && (
                <img src={projects[lightboxIdx]!.image!} alt={projects[lightboxIdx]!.name} className="max-w-full max-h-full object-contain" />
              )}
            </div>
            <div className="text-white text-center mt-6 px-4">
              <h3 className="text-2xl font-bold mb-2">{projects[lightboxIdx]?.name}</h3>
              <p className="text-base opacity-80 max-w-3xl mx-auto">{projects[lightboxIdx]?.description}</p>
              <p className="text-sm opacity-60 mt-4">{lightboxIdx + 1} / {projects.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
