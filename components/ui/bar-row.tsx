import type { ReactNode } from 'react';
import { barWidthPercent } from '@/lib/ruler';

type BarRowProps = {
  label: ReactNode;
  value: number;
  // Largest value of the chart (the bars share one scale, starting at zero).
  max: number;
  colorClass: string;
  // Displayed value when it differs from the raw number, e.g. "1 240 €".
  display?: string;
};

// One horizontal bar: label, track, value. The value is always written in clear.
export function BarRow({ label, value, max, colorClass, display }: BarRowProps) {
  return (
    <div className="grid grid-cols-[96px_1fr_auto] items-center gap-2 text-caption-12 text-fg-2">
      <span className="truncate">{label}</span>
      <span aria-hidden="true" className="h-2 overflow-hidden rounded-tick bg-surface-sunken">
        <span
          className={`block h-full rounded-tick transition-[width] duration-(--duration-change) ease-out-soft ${colorClass}`}
          style={{ width: `${barWidthPercent(value, max)}%` }}
        />
      </span>
      <span className="min-w-6 text-right font-semibold text-fg-1 tabular">{display ?? value}</span>
    </div>
  );
}

type BarChartRow = {
  key: string;
  label: string;
  value: number;
  colorClass: string;
  display?: string;
};

// A small bar chart with a sentence summary and an equivalent table for screen readers.
export function BarChart({
  caption,
  rows,
  valueHeader = 'Valeur',
}: {
  // One sentence that says what the chart shows, e.g. "Réponses à tes 20 candidatures".
  caption: string;
  rows: BarChartRow[];
  valueHeader?: string;
}) {
  const max = Math.max(0, ...rows.map((row) => row.value));
  // Largest first, so the chart reads from top to bottom.
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="sr-only">{caption}</figcaption>
      <div aria-hidden="true" className="flex flex-col gap-1.5">
        {sorted.map((row) => (
          <BarRow
            key={row.key}
            label={row.label}
            value={row.value}
            max={max}
            colorClass={row.colorClass}
            display={row.display}
          />
        ))}
      </div>
      <table className="sr-only">
        <thead>
          <tr>
            <th scope="col">Catégorie</th>
            <th scope="col">{valueHeader}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              <td>{row.display ?? row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
