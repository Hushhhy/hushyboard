import { segmentFills } from '@/lib/ruler';

type RulerProps = {
  value: number;
  max: number;
  // Accessible name, e.g. "Expérience du niveau".
  label: string;
  // Spoken value, e.g. "340 XP sur 500, niveau 4, Timonier". Defaults to "value sur max".
  valueText?: string;
  segments?: number;
  // Fill color class, e.g. "bg-career".
  colorClass: string;
  // Pale color of a started segment (skills), e.g. "bg-career-deep".
  partialColorClass?: string;
  // Index of the segment drawn pale because it is started but not complete.
  partialIndex?: number;
  size?: 'large' | 'small';
  className?: string;
};

// Graduated ruler, read like a caliper: ticks fill one by one.
// Large = 10px (Career XP), small = 6px (daily progress, skills, games).
export function Ruler({
  value,
  max,
  label,
  valueText,
  segments = 10,
  colorClass,
  partialColorClass = 'bg-career-deep',
  partialIndex,
  size = 'large',
  className = '',
}: RulerProps) {
  const fills = segmentFills(value, max, segments);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText ?? `${value} sur ${max}`}
      className={`flex ${size === 'large' ? 'h-2.5 gap-1' : 'h-1.5 gap-0.5'} ${className}`}
    >
      {fills.map((fill, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`relative flex-1 overflow-hidden rounded-tick ${
            index === partialIndex && fill === 0 ? partialColorClass : 'bg-surface-sunken'
          }`}
        >
          <span
            className={`absolute inset-y-0 left-0 rounded-tick transition-[width] duration-(--duration-change) ease-out-soft ${colorClass}`}
            style={{ width: `${fill * 100}%` }}
          />
        </span>
      ))}
    </div>
  );
}
