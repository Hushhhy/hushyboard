import { formatMonthKey } from '@/lib/dates';
import { formatEuros, formatSignedEuros } from '@/lib/finance';
import { niceCeil, type CategoryFigures, type MonthFigures } from '@/lib/finance-analysis';

// Finance charts. Server components: SVG and CSS only, each with an equivalent table for
// screen readers. Hover and keyboard focus show the same details.

const shortMonth = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
const monthLabel = (month: string) => shortMonth.format(new Date(`${month}-01T00:00:00.000Z`));

// Whole euros for axes and dense cells: 123456 → "1 235 €".
const roundEuros = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
export const formatRoundEuros = (cents: number) => roundEuros.format(cents / 100);

// Month-end balance (carried over), as a line (finance color) with a table for screen readers.
export function BalanceTrend({
  points,
  caption,
}: {
  points: { month: string; balance: number }[];
  caption: string;
}) {
  // Positions in % of the plot: the line stretches with the card, the dots and labels stay round.
  const values = points.map((point) => point.balance);
  const top = Math.max(0, ...values);
  const bottom = Math.min(0, ...values);
  const span = top - bottom || 1;
  const x = (index: number) => 5 + (index * 90) / Math.max(1, points.length - 1);
  const y = (value: number) => 8 + ((top - value) * 84) / span;
  const path = points
    .map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point.balance)}`)
    .join(' ');
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="sr-only">{caption}</figcaption>
      <div aria-hidden="true" className="relative h-32">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          <line
            x1={5}
            x2={95}
            y1={y(0)}
            y2={y(0)}
            className="stroke-line-strong"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={path}
            fill="none"
            className="stroke-finance"
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {points.map((point, index) => (
          <span
            key={point.month}
            title={`${formatMonthKey(point.month)} : ${formatSignedEuros(point.balance)}`}
            className={`absolute -translate-1/2 rounded-full bg-finance ${
              index === points.length - 1 ? 'size-2.5' : 'size-1.5'
            }`}
            style={{ left: `${x(index)}%`, top: `${y(point.balance)}%` }}
          />
        ))}
      </div>
      <div aria-hidden="true" className="relative h-4 text-caption-12 text-fg-3">
        {points.map((point, index) => (
          <span
            key={point.month}
            className="absolute -translate-x-1/2"
            style={{ left: `${x(index)}%` }}
          >
            {monthLabel(point.month)}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <thead>
          <tr>
            <th scope="col">Mois</th>
            <th scope="col">Solde</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month}>
              <th scope="row">{formatMonthKey(point.month)}</th>
              <td>{formatSignedEuros(point.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

const SERIES = [
  { key: 'income', label: 'Revenus', colorClass: 'bg-finance' },
  { key: 'expenses', label: 'Dépenses', colorClass: 'bg-line-strong' },
] as const;

// Income and expenses side by side, one pair of columns per month, on one euro axis.
export function IncomeExpenseColumns({ months }: { months: MonthFigures[] }) {
  const max = niceCeil(Math.max(0, ...months.flatMap((month) => [month.income, month.expenses])));
  const height = (value: number) => (max > 0 ? (value / max) * 100 : 0);
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="sr-only">Revenus et dépenses de chaque mois</figcaption>
      <ul aria-hidden="true" className="flex gap-4 text-caption-12 text-fg-2">
        {SERIES.map((series) => (
          <li key={series.key} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-tick ${series.colorClass}`} />
            {series.label}
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        {/* Axis: 0, half, top. */}
        <div
          aria-hidden="true"
          className="relative h-44 min-w-12 text-right text-caption-12 text-fg-3 tabular"
        >
          {[1, 0.5, 0].map((ratio) => (
            <span
              key={ratio}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${(1 - ratio) * 100}%` }}
            >
              {formatRoundEuros(max * ratio)}
            </span>
          ))}
        </div>
        <div className="relative h-44">
          {[1, 0.5, 0].map((ratio) => (
            <span
              key={ratio}
              aria-hidden="true"
              className="absolute inset-x-0 h-px bg-line-subtle"
              style={{ top: `${(1 - ratio) * 100}%` }}
            />
          ))}
          <ul className="absolute inset-0 flex">
            {months.map((month, index) => {
              const align =
                index === 0
                  ? 'left-0'
                  : index === months.length - 1
                    ? 'right-0'
                    : 'left-1/2 -translate-x-1/2';
              return (
                <li
                  key={month.month}
                  tabIndex={0}
                  aria-label={`${formatMonthKey(month.month)} : revenus ${formatEuros(month.income)}, dépenses ${formatEuros(month.expenses)}, solde ${formatSignedEuros(month.balance)}`}
                  className="group relative flex flex-1 items-end justify-center gap-0.5 rounded-tick outline-offset-2 hover:bg-surface-raised/40"
                >
                  {SERIES.map((series) => (
                    <span
                      key={series.key}
                      aria-hidden="true"
                      className={`w-full max-w-6 rounded-t-tick transition-[height] duration-(--duration-change) ease-out-soft ${series.colorClass}`}
                      style={{ height: `${height(month[series.key])}%` }}
                    />
                  ))}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max flex-col gap-0.5 rounded-control bg-surface-overlay px-2.5 py-2 text-caption-12 text-fg-2 shadow-raised group-hover:flex group-focus-visible:flex ${align}`}
                  >
                    <span className="font-semibold text-fg-1">{formatMonthKey(month.month)}</span>
                    <span className="tabular">Revenus {formatEuros(month.income)}</span>
                    <span className="tabular">Dépenses {formatEuros(month.expenses)}</span>
                    <span className="tabular">Solde {formatSignedEuros(month.balance)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <span />
        <div aria-hidden="true" className="mt-1.5 flex text-caption-12 text-fg-3">
          {months.map((month) => (
            <span key={month.month} className="flex-1 text-center">
              {monthLabel(month.month)}
            </span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <thead>
          <tr>
            <th scope="col">Mois</th>
            <th scope="col">Revenus</th>
            <th scope="col">Dépenses</th>
            <th scope="col">Solde du mois</th>
          </tr>
        </thead>
        <tbody>
          {months.map((month) => (
            <tr key={month.month}>
              <th scope="row">{formatMonthKey(month.month)}</th>
              <td>{formatEuros(month.income)}</td>
              <td>{formatEuros(month.expenses)}</td>
              <td>{formatSignedEuros(month.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

// Expenses of each category, month by month: a real table whose cells are tinted by amount
// (one hue, darker = more). The amount is always written, the tint only helps to scan.
export function CategoryHeatmap({
  months,
  categories,
}: {
  months: string[];
  categories: CategoryFigures[];
}) {
  const max = Math.max(0, ...categories.flatMap((category) => category.monthly));
  const tint = (value: number) =>
    value > 0 && max > 0
      ? {
          backgroundColor: `color-mix(in oklab, var(--color-finance) ${Math.round(
            6 + (value / max) * 34
          )}%, transparent)`,
        }
      : undefined;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0.5 text-caption-12">
        <caption className="sr-only">Dépenses de chaque catégorie, mois par mois</caption>
        <thead>
          <tr className="text-fg-3">
            <th scope="col" className="py-1 pr-2 text-left font-medium">
              Catégorie
            </th>
            {months.map((month) => (
              <th key={month} scope="col" className="px-1 py-1 text-right font-medium">
                <abbr title={formatMonthKey(month)} className="no-underline">
                  {monthLabel(month)}
                </abbr>
              </th>
            ))}
            <th scope="col" className="py-1 pl-2 text-right font-medium">
              Moyenne
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.name}>
              <th
                scope="row"
                className="max-w-36 truncate py-1.5 pr-2 text-left font-medium text-fg-1"
              >
                {category.name}
              </th>
              {category.monthly.map((value, index) => (
                <td
                  key={months[index]}
                  className={`rounded-tick px-1.5 py-1.5 text-right whitespace-nowrap tabular ${
                    value > 0 ? 'text-fg-1' : 'text-fg-3'
                  }`}
                  style={tint(value)}
                >
                  {value > 0 ? formatRoundEuros(value) : '—'}
                </td>
              ))}
              <td className="py-1.5 pl-2 text-right font-semibold whitespace-nowrap text-fg-1 tabular">
                {formatRoundEuros(category.average)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
