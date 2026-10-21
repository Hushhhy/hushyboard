import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { formatMonthKey, formatMonthKeyName, shiftMonthKey } from '@/lib/dates';
import { buttonClasses } from './button';

type MonthPickerProps = {
  // Displayed month, "YYYY-MM".
  month: string;
  // First month with data and current month: the arrows stop there.
  min?: string;
  max: string;
  // Page URL; the month goes in ?month=YYYY-MM.
  basePath: string;
};

function MonthArrow({
  target,
  enabled,
  basePath,
  direction,
}: {
  target: string;
  enabled: boolean;
  basePath: string;
  direction: 'previous' | 'next';
}) {
  const label = `${direction === 'previous' ? 'Mois précédent' : 'Mois suivant'} : ${formatMonthKeyName(target)}`;
  const icon =
    direction === 'previous' ? (
      <ChevronLeftIcon className="size-4" />
    ) : (
      <ChevronRightIcon className="size-4" />
    );

  // A link cannot be disabled, so the unavailable arrow is a disabled button.
  if (!enabled) {
    return (
      <button
        type="button"
        disabled
        aria-label={label}
        className={buttonClasses({ variant: 'icon' })}
      >
        {icon}
      </button>
    );
  }
  return (
    <Link
      href={`${basePath}?month=${target}`}
      aria-label={label}
      className={buttonClasses({ variant: 'icon' })}
    >
      {icon}
    </Link>
  );
}

// Server component: the month lives in the URL, so it works without JavaScript.
export function MonthPicker({ month, min, max, basePath }: MonthPickerProps) {
  const previous = shiftMonthKey(month, -1);
  const next = shiftMonthKey(month, 1);

  return (
    <div role="group" aria-label="Mois affiché" className="flex items-center gap-1">
      <MonthArrow
        target={previous}
        enabled={!min || previous >= min}
        basePath={basePath}
        direction="previous"
      />
      <span
        aria-live="polite"
        className="min-w-28 text-center text-caption-12 font-semibold capitalize tabular"
      >
        {formatMonthKey(month)}
      </span>
      <MonthArrow target={next} enabled={next <= max} basePath={basePath} direction="next" />
    </div>
  );
}
