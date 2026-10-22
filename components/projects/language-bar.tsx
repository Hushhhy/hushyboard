import { languageColor, type LanguageShare } from '@/lib/github/helpers';

// Language share of a repo: a bar plus a legend with names and percents (the colour alone
// never carries the meaning). compact = top 3 under the bar, as on the cards.
export function LanguageBar({
  languages,
  compact = false,
}: {
  languages: LanguageShare[];
  compact?: boolean;
}) {
  if (languages.length === 0) {
    return <p className="text-caption-12 text-fg-3">Langages non détectés.</p>;
  }
  const shown = compact ? languages.slice(0, 3) : languages;
  const percentFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden="true" className="flex h-1.5 gap-0.5 overflow-hidden rounded-tick">
        {languages.map((language, index) => (
          <span
            key={language.name}
            className={`h-full rounded-tick ${languageColor(language.name, index)}`}
            style={{ width: `${language.percent}%` }}
          />
        ))}
      </div>
      <ul
        className={
          compact
            ? 'flex flex-wrap gap-x-3 gap-y-1 text-caption-12 text-fg-2'
            : 'flex flex-col gap-1 text-body-14'
        }
      >
        {shown.map((language, index) => (
          <li key={language.name} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`size-2 shrink-0 rounded-full ${languageColor(language.name, index)}`}
            />
            <span className={compact ? '' : 'flex-1'}>{language.name}</span>
            <span className="text-fg-2 tabular">{percentFormatter.format(language.percent)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
