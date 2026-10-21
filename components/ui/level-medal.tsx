type LevelMedalProps = {
  level: number;
  // Large = focal emblem (80×88), small = toast and history (52).
  size?: 'large' | 'small';
  // Next level, drawn dashed (Progression screen).
  upcoming?: boolean;
  className?: string;
};

const HEXAGON = 'M46 3 88 27v46L46 97 4 73V27z';

// Hexagonal Career medal with the level number. Decorative: the level is always also written as text.
export function LevelMedal({
  level,
  size = 'large',
  upcoming = false,
  className = '',
}: LevelMedalProps) {
  return (
    <div
      aria-hidden="true"
      className={`relative grid shrink-0 place-items-center ${
        size === 'large' ? 'h-22 w-20' : 'h-14 w-13'
      } ${className}`}
    >
      <svg viewBox="0 0 92 100" className="absolute inset-0 size-full">
        {upcoming ? (
          <path
            d={HEXAGON}
            className="fill-none stroke-line-strong"
            strokeWidth="2.5"
            strokeDasharray="6 5"
            strokeLinejoin="round"
          />
        ) : (
          <>
            <path
              d={HEXAGON}
              className="fill-career-deep stroke-career"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Inner rule */}
            <path
              d="M46 11 81 31v38L46 89 11 69V31z"
              className="fill-none stroke-career/35"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>
      <span
        className={`relative font-display tabular ${upcoming ? 'text-fg-3' : 'text-career'} ${
          size === 'large' ? 'text-display-30' : 'text-display-20'
        }`}
      >
        {level}
      </span>
    </div>
  );
}
