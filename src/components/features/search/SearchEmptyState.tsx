interface SearchEmptyStateProps {
  variant: "initial" | "empty";
  accentColor: string;
}

export default function SearchEmptyState({ variant, accentColor }: SearchEmptyStateProps): JSX.Element {
  if (variant === "initial") {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: `${accentColor}15` }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: accentColor }}>search</span>
        </div>
        <h3 className="font-heading font-bold text-[18px] text-[#242424] mb-2">Saisissez votre recherche</h3>
        <p className="text-[14px] text-[#616161] max-w-md mx-auto">
          Indiquez le secteur, le nom ou les mots-cl&eacute;s que vous cherchez, puis cliquez sur{" "}
          <strong style={{ color: accentColor }}>Rechercher</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F5F5F5] mb-4">
        <span className="material-symbols-outlined text-[#8A8886]" style={{ fontSize: 32 }}>search_off</span>
      </div>
      <h3 className="font-heading font-bold text-[18px] text-[#242424] mb-2">Aucun r&eacute;sultat</h3>
      <p className="text-[14px] text-[#616161] max-w-md mx-auto">
        Aucune entreprise ne correspond &agrave; votre recherche. Essayez d&apos;autres mots-cl&eacute;s ou &eacute;largissez vos filtres.
      </p>
    </div>
  );
}
