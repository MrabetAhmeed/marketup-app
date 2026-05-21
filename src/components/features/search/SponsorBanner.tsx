export default function SponsorBanner(): JSX.Element {
  return (
    <section className="px-6 pt-6 pb-2 max-w-7xl mx-auto">
      <div className="relative w-full h-[220px] rounded-lg overflow-hidden bg-slate-900 group">
        <img
          alt="Sponsor"
          className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80"
        />
        <span className="absolute top-3 left-3 z-10 text-[10px] font-bold tracking-widest uppercase text-white/70 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded">
          Sponsoris&eacute;
        </span>
        <div className="relative z-10 h-full flex flex-col justify-center items-start px-6 md:px-10 max-w-2xl">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-1.5">VERIPRO TUNISIE SA</h2>
          <p className="text-slate-300 mb-4 text-sm leading-relaxed line-clamp-2">
            Leader de l&apos;audit et du conseil strat&eacute;gique pour l&apos;industrie 4.0 en Afrique du Nord.
          </p>
          <span className="inline-flex items-center text-white font-semibold text-sm hover:translate-x-1 transition-transform cursor-pointer">
            D&eacute;couvrir
            <span className="material-symbols-outlined ml-1 text-lg">arrow_forward</span>
          </span>
        </div>
      </div>
    </section>
  );
}
