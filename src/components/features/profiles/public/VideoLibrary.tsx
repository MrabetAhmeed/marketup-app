"use client";

import { useState, useMemo, useCallback } from "react";

interface Video {
  id: string;
  source: string;
  videoId: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  category: string;
  title: string;
  description: string;
  publishedAt: string | null;
}

interface VideoLibraryProps {
  videos: Video[];
}

const CATEGORIES = [
  { key: "actualite", label: "Actualit\u00e9s" },
  { key: "offres", label: "Offres" },
  { key: "astuces", label: "Astuces" },
  { key: "emplois", label: "Emplois" },
];

function buildEmbedUrl(video: Video, autoplay: boolean): string {
  const ap = autoplay ? 1 : 0;
  switch (video.source) {
    case "youtube":
      return `https://www.youtube.com/embed/${video.videoId}?autoplay=${ap}&rel=0&modestbranding=1`;
    case "vimeo":
      return `https://player.vimeo.com/video/${video.videoId}?autoplay=${ap}&title=0&byline=0&portrait=0`;
    case "dailymotion":
      return `https://www.dailymotion.com/embed/video/${video.videoId}?autoplay=${ap}&queue-enable=false`;
    default:
      return "";
  }
}

function formatDateLong(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function VideoLibrary({ videos }: VideoLibraryProps): JSX.Element {
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    return videos[0]?.category ?? "actualite";
  });
  const [activeVideoId, setActiveVideoId] = useState<string | null>(videos[0]?.id ?? null);
  const [autoplay, setAutoplay] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(6);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    videos.forEach((v) => { c[v.category] = (c[v.category] ?? 0) + 1; });
    return c;
  }, [videos]);

  const filteredVideos = useMemo(() => {
    let filtered = videos.filter((v) => v.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((v) =>
        v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [videos, activeCategory, searchQuery]);

  const displayedVideos = filteredVideos.slice(0, displayCount);
  const activeVideo = videos.find((v) => v.id === activeVideoId) ?? filteredVideos[0] ?? videos[0];

  const handleCardClick = useCallback((video: Video) => {
    setActiveVideoId(video.id);
    setAutoplay(true);
    // Scroll to player
    document.getElementById("tu-video-player")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (videos.length === 0) return <></>;

  return (
    <div className="mb-16">
      {/* Featured video player */}
      {activeVideo && (
        <div id="tu-video-player" className="mb-16">
          <div className="aspect-video bg-black rounded-[14px] overflow-hidden shadow-2xl relative">
            {autoplay ? (
              <iframe
                src={buildEmbedUrl(activeVideo, true)}
                className="w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title={activeVideo.title}
              />
            ) : (
              <button
                type="button"
                className="w-full h-full relative group"
                onClick={() => setAutoplay(true)}
              >
                {activeVideo.thumbnailUrl && (
                  <img src={activeVideo.thumbnailUrl} alt={activeVideo.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <span className="material-symbols-outlined text-white text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                  </div>
                </div>
              </button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded">
              {CATEGORIES.find((c) => c.key === activeVideo.category)?.label ?? activeVideo.category}
            </span>
            <span className="text-[12px] text-outline">{formatDateLong(activeVideo.publishedAt)}</span>
          </div>
          <h2 className="text-2xl font-bold text-on-surface mt-2">{activeVideo.title}</h2>
        </div>
      )}

      {/* Tabs + search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-surface-container pb-0 mb-8">
        <div className="flex overflow-x-auto gap-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => {
                setActiveCategory(cat.key);
                setDisplayCount(6);
                setSearchQuery("");
                const firstInCat = videos.find((v) => v.category === cat.key);
                setActiveVideoId(firstInCat?.id ?? null);
              }}
              className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.key
                  ? "font-bold text-primary border-b-2 border-primary"
                  : "text-outline hover:text-on-surface"
              }`}
            >
              {cat.label} ({counts[cat.key] ?? 0})
            </button>
          ))}
        </div>
        <div className="relative w-full md:max-w-[300px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
          <input
            type="text"
            placeholder="Rechercher une vid\u00e9o..."
            className="w-full bg-surface-container-high border-none rounded-[14px] pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayedVideos.map((v) => {
          const isActive = v.id === activeVideoId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => handleCardClick(v)}
              className={`flex flex-col gap-4 p-4 rounded-[14px] text-left transition-all ${
                isActive
                  ? "border-2 border-primary shadow-md bg-white"
                  : "bg-surface-container-lowest hover:bg-surface-container border border-transparent"
              }`}
            >
              <div className="aspect-video rounded-lg overflow-hidden relative group bg-black">
                {v.thumbnailUrl && (
                  <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                    isActive ? "bg-primary/10 text-primary" : "bg-surface-container-highest text-on-surface-variant"
                  }`}>
                    {CATEGORIES.find((c) => c.key === v.category)?.label ?? v.category}
                  </span>
                  <span className="text-[11px] text-outline">{formatDateLong(v.publishedAt)}</span>
                </div>
                <h3 className={`font-bold text-lg mt-1 line-clamp-1 ${isActive ? "text-primary" : "text-on-surface"}`}>{v.title}</h3>
                <p className="text-on-surface-variant text-sm line-clamp-2 mt-1">{v.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {displayedVideos.length === 0 && (
        <p className="text-center text-on-surface-variant py-8">Aucune vid&eacute;o dans cette cat&eacute;gorie.</p>
      )}

      {/* Load more */}
      {displayCount < filteredVideos.length && (
        <div className="flex justify-center mt-10">
          <button
            type="button"
            onClick={() => setDisplayCount((c) => c + 6)}
            className="w-full md:w-auto px-12 py-3 border border-outline-variant text-on-surface font-semibold rounded-[14px] hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
          >
            Afficher plus de vid&eacute;os
            <span className="material-symbols-outlined">expand_more</span>
          </button>
        </div>
      )}
    </div>
  );
}
